import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { HttpService } from '@nestjs/axios';
import { Queue } from 'bullmq';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import { AgentsService } from '@/modules/agents/agents.service';
import { Business } from '@auth/entities/business.entity';
import { KnowledgeDocument } from '@/modules/agents/entities/knowledge-document.entity';
import { KnowledgeDocumentStatus } from '@/modules/agents/enums/knowledge-document-status.enum';
import { KnowledgeCallbackDto } from '@/modules/knowledge/dto/knowledge-callback.dto';
import { detectKnowledgeMimeType } from '@/modules/knowledge/utils/detect-knowledge-mime.util';
import {
  KB_INGESTION_QUEUE,
  KB_DELETION_QUEUE,
} from '@/modules/knowledge/constants/knowledge.constants';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepo: Repository<KnowledgeDocument>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectQueue(KB_INGESTION_QUEUE)
    private readonly kbQueue: Queue,
    @InjectQueue(KB_DELETION_QUEUE)
    private readonly kbDeletionQueue: Queue,
    private readonly agentsService: AgentsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get storageServiceUrl(): string {
    return this.configService.get<string>('STORAGE_SERVICE_URL', '');
  }

  private get storageServiceToken(): string {
    return this.configService.get<string>('STORAGE_SERVICE_TOKEN', '');
  }

  async uploadDocument(
    businessId: string,
    agentId: string,
    file: Express.Multer.File,
    uploadedBy: string,
  ): Promise<KnowledgeDocument> {
    await this.agentsService.findOne(businessId, agentId);

    const plan = await this.getPlanOrThrow(businessId);

    if (!plan.kbMaxDocumentsPerAgent) {
      throw new ForbiddenException(
        'Tu plan no incluye base de conocimiento para agentes.',
      );
    }

    const maxFileSizeBytes = plan.kbMaxFileSizeMb * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      throw new BadRequestException(
        `El archivo excede el tamaño máximo permitido por tu plan (${plan.kbMaxFileSizeMb}MB).`,
      );
    }

    const documentsForAgent = await this.documentRepo.count({
      where: { agentId },
    });
    if (documentsForAgent >= plan.kbMaxDocumentsPerAgent) {
      throw new ForbiddenException(
        `Este agente ya alcanzó el límite de ${plan.kbMaxDocumentsPerAgent} documentos de tu plan.`,
      );
    }

    const sizeRow = await this.documentRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.fileSizeBytes), 0)', 'sum')
      .where('d.businessId = :businessId', { businessId })
      .getRawOne<{ sum: string }>();
    const storageUsedBytes = Number(sizeRow?.sum ?? 0);
    const maxStorageBytes = plan.kbMaxStorageMbPerBusiness * 1024 * 1024;
    if (storageUsedBytes + file.size > maxStorageBytes) {
      throw new ForbiddenException(
        `Tu negocio alcanzó el límite de almacenamiento de conocimiento de tu plan (${plan.kbMaxStorageMbPerBusiness}MB).`,
      );
    }

    const uploadsThisMonth = await this.documentRepo.count({
      where: { businessId, createdAt: MoreThanOrEqual(startOfMonth()) },
    });
    if (uploadsThisMonth >= plan.kbMonthlyUploadLimit) {
      throw new ForbiddenException(
        `Alcanzaste el límite de ${plan.kbMonthlyUploadLimit} subidas mensuales de tu plan.`,
      );
    }

    const detectedMime = await detectKnowledgeMimeType(
      file.buffer,
      file.mimetype,
    );
    if (!detectedMime) {
      throw new BadRequestException(
        'Formato de archivo no permitido. Usa PDF, DOCX, TXT, MD o CSV.',
      );
    }

    // Se crea en estado pending ANTES de llamar a storage, para tener un id
    // propio que usar como entityId de esa llamada.
    const document = this.documentRepo.create({
      businessId,
      agentId,
      fileName: file.originalname,
      fileType: detectedMime,
      fileSizeBytes: file.size,
      status: KnowledgeDocumentStatus.PENDING,
      uploadedBy,
    });
    await this.documentRepo.save(document);

    try {
      const form = new FormData();
      form.append('businessId', businessId);
      form.append('module', 'agent_knowledge');
      form.append('entityId', document.id);
      form.append('file', file.buffer, {
        filename: file.originalname,
        contentType: detectedMime,
      });

      const response = await firstValueFrom(
        this.httpService.post<{ id: string }>(
          `${this.storageServiceUrl}/storage/upload`,
          form,
          {
            headers: {
              ...form.getHeaders(),
              'x-service-token': this.storageServiceToken,
            },
          },
        ),
      );

      document.storageFileId = response.data.id;
      await this.documentRepo.save(document);
    } catch (error) {
      document.status = KnowledgeDocumentStatus.FAILED;
      document.errorMessage = 'No se pudo subir el archivo al servicio de storage';
      await this.documentRepo.save(document);
      this.logger.error(
        `Fallo subiendo documento ${document.id} a zyntra-storage: ${error}`,
      );
      throw new BadGatewayException(
        'No se pudo subir el archivo al servicio de storage',
      );
    }

    await this.kbQueue.add(
      'ingest-document',
      {
        document_id: document.id,
        storage_file_id: document.storageFileId,
        file_type: document.fileType,
        agentId,
        businessId,
      },
      { jobId: document.id, removeOnComplete: false, removeOnFail: false },
    );

    return document;
  }

  async findAll(
    businessId: string,
    agentId: string,
  ): Promise<KnowledgeDocument[]> {
    await this.agentsService.findOne(businessId, agentId);
    return this.documentRepo.find({
      where: { businessId, agentId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    businessId: string,
    agentId: string,
    documentId: string,
  ): Promise<KnowledgeDocument> {
    await this.agentsService.findOne(businessId, agentId);
    const document = await this.documentRepo.findOne({
      where: { id: documentId, businessId, agentId },
    });
    if (!document) throw new NotFoundException('Documento no encontrado');
    return document;
  }

  async remove(
    businessId: string,
    agentId: string,
    documentId: string,
  ): Promise<{ success: boolean }> {
    const document = await this.findOne(businessId, agentId, documentId);

    if (document.storageFileId) {
      try {
        await firstValueFrom(
          this.httpService.delete(
            `${this.storageServiceUrl}/storage/files/${document.storageFileId}`,
            {
              headers: {
                'x-service-token': this.storageServiceToken,
                'x-company-id': businessId,
              },
            },
          ),
        );
      } catch (error) {
        // No dejamos un documento huérfano en nuestra DB solo porque storage
        // falló en limpiar su lado — se puede reintentar manualmente ahí.
        this.logger.warn(
          `No se pudo borrar el archivo ${document.storageFileId} en zyntra-storage: ${error}`,
        );
      }
    }

    const agent = await this.agentsService.findOne(businessId, agentId);
    if (agent.knowledgeCollection) {
      await this.kbDeletionQueue.add('delete-document-vectors', {
        scope: 'document',
        knowledgeCollection: agent.knowledgeCollection,
        documentId: document.id,
      });
    }

    await this.documentRepo.remove(document);
    return { success: true };
  }

  async reprocess(
    businessId: string,
    agentId: string,
    documentId: string,
  ): Promise<KnowledgeDocument> {
    const document = await this.findOne(businessId, agentId, documentId);
    if (!document.storageFileId) {
      throw new ConflictException(
        'El documento no tiene un archivo asociado en storage todavía.',
      );
    }

    document.status = KnowledgeDocumentStatus.PENDING;
    document.errorMessage = null as unknown as string;
    await this.documentRepo.save(document);

    await this.kbQueue.add(
      'ingest-document',
      {
        document_id: document.id,
        storage_file_id: document.storageFileId,
        file_type: document.fileType,
        agentId,
        businessId,
      },
      {
        jobId: `${document.id}-reprocess-${Date.now()}`,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    return document;
  }

  async getUsage(businessId: string) {
    const plan = await this.getPlanOrThrow(businessId);

    const usageRow = await this.documentRepo
      .createQueryBuilder('d')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(d.fileSizeBytes), 0)', 'sum')
      .where('d.businessId = :businessId', { businessId })
      .getRawOne<{ count: string; sum: string }>();
    const { count, sum } = usageRow ?? { count: '0', sum: '0' };

    const uploadsThisMonth = await this.documentRepo.count({
      where: { businessId, createdAt: MoreThanOrEqual(startOfMonth()) },
    });

    return {
      documentsUsed: Number(count ?? 0),
      storageUsedMb:
        Math.round((Number(sum ?? 0) / (1024 * 1024)) * 100) / 100,
      uploadsThisMonth,
      limits: {
        kbMaxDocumentsPerAgent: plan.kbMaxDocumentsPerAgent,
        kbMaxFileSizeMb: plan.kbMaxFileSizeMb,
        kbMaxStorageMbPerBusiness: plan.kbMaxStorageMbPerBusiness,
        kbMonthlyUploadLimit: plan.kbMonthlyUploadLimit,
      },
    };
  }

  async handleCallback(dto: KnowledgeCallbackDto): Promise<{ ok: boolean }> {
    const document = await this.documentRepo.findOne({
      where: { id: dto.documentId },
    });
    if (!document) throw new NotFoundException('Documento no encontrado');

    document.status = dto.status;
    if (dto.chunkCount !== undefined) document.chunkCount = dto.chunkCount;
    if (dto.tokenCount !== undefined) document.tokenCount = dto.tokenCount;
    if (dto.errorMessage !== undefined) document.errorMessage = dto.errorMessage;
    document.processedAt = new Date();

    await this.documentRepo.save(document);
    return { ok: true };
  }

  assertOwnership(requestBusinessId: string, paramBusinessId: string) {
    if (requestBusinessId !== paramBusinessId) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }
  }

  private async getPlanOrThrow(businessId: string) {
    const business = await this.businessRepo.findOne({
      where: { id: businessId },
      relations: ['plan_object'],
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (!business.plan_object) {
      throw new ForbiddenException('Tu negocio no tiene un plan asignado.');
    }
    return business.plan_object;
  }
}

function startOfMonth(): Date {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}
