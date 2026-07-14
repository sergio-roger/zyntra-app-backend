import { Business } from '@auth/entities/business.entity';
import { CreateDealDto, ListDealsDto, UpdateDealDto } from '@crm/dto/deal.dto';
import { ContactActivity } from '@crm/entities/contact-activity.entity';
import { Contact } from '@crm/entities/contact.entity';
import { DealStageHistory } from '@crm/entities/deal-stage-history.entity';
import { Deal } from '@crm/entities/deal.entity';
import { PipelineStage } from '@crm/entities/pipeline-stage.entity';
import { Pipeline } from '@crm/entities/pipeline.entity';
import { ActivityCreatedBy } from '@crm/enums/activity-created-by.enum';
import { ActivityType } from '@crm/enums/activity-type.enum';
import { DealStatus } from '@crm/enums/deal-status.enum';
import { PipelineStageType } from '@crm/enums/pipeline-stage-type.enum';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  In,
  IsNull,
  QueryDeepPartialEntity,
  Repository,
} from 'typeorm';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealsRepo: Repository<Deal>,
    @InjectRepository(Contact)
    private readonly contactsRepo: Repository<Contact>,
    @InjectRepository(ContactActivity)
    private readonly activitiesRepo: Repository<ContactActivity>,
    @InjectRepository(Pipeline)
    private readonly pipelineRepo: Repository<Pipeline>,
    @InjectRepository(PipelineStage)
    private readonly stageRepo: Repository<PipelineStage>,
    @InjectRepository(DealStageHistory)
    private readonly historyRepo: Repository<DealStageHistory>,
  ) {}

  // ─── List ──────────────────────────────────────────────────────────────────

  async list(business: Business, query: ListDealsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.dealsRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.contacts', 'c')
      .leftJoinAndSelect('d.company', 'comp')
      .leftJoinAndSelect('d.assignedTo', 'u')
      .leftJoinAndSelect('d.stage', 's')
      .where('d.businessId = :bid', { bid: business.id });

    if (query.pipelineId)
      qb.andWhere('d.pipelineId = :pid', { pid: query.pipelineId });
    if (query.stageId) qb.andWhere('d.stageId = :sid', { sid: query.stageId });
    if (query.status)
      qb.andWhere('d.status = :status', { status: query.status });
    if (query.contactId) {
      qb.innerJoin('d.contacts', 'contactFilter');
      qb.andWhere('contactFilter.id = :cid', { cid: query.contactId });
    }
    if (query.companyId)
      qb.andWhere('d.companyId = :compid', { compid: query.companyId });
    if (query.assignedToId)
      qb.andWhere('d.assignedToId = :uid', { uid: query.assignedToId });
    if (query.teamId) qb.andWhere('d.teamId = :tid', { tid: query.teamId });

    if (query.search) {
      qb.leftJoin('d.contacts', 'searchContacts');
      qb.andWhere(
        new Brackets((q) => {
          q.where('d.title ILIKE :s', { s: `%${query.search}%` }).orWhere(
            'searchContacts.name ILIKE :s',
            { s: `%${query.search}%` },
          );
        }),
      );
    }

    qb.orderBy('d.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ─── Find One ──────────────────────────────────────────────────────────────

  async findOne(business: Business, id: string): Promise<Deal> {
    const deal = await this.dealsRepo.findOne({
      where: { id, businessId: business.id },
      relations: [
        'contacts',
        'company',
        'assignedTo',
        'team',
        'stage',
        'pipeline',
      ],
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(business: Business, dto: CreateDealDto): Promise<Deal> {
    const contacts =
      dto.contactIds?.length > 0
        ? await this.contactsRepo.find({
            where: { id: In(dto.contactIds), businessId: business.id },
          })
        : [];

    const pipeline = await this.pipelineRepo.findOne({
      where: { id: dto.pipelineId, businessId: business.id },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const stage = await this.stageRepo.findOne({
      where: { id: dto.stageId, pipelineId: pipeline.id },
    });
    if (!stage)
      throw new BadRequestException(
        'La fase no pertenece al pipeline indicado',
      );

    const { status, closedAt } = this.deriveStatusFromStage(stage);

    const deal = this.dealsRepo.create({
      title: dto.title,
      description: dto.description,
      value: dto.value,
      currency: dto.currency,
      pipelineId: dto.pipelineId,
      stageId: dto.stageId,
      companyId: dto.companyId,
      assignedToId: dto.assignedToId,
      teamId: dto.teamId,
      expectedCloseDate: dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : null,
      probability: dto.probability,
      businessId: business.id,
      status,
      closedAt,
      contacts,
    });

    const saved = await this.dealsRepo.save(deal);

    await this.historyRepo.save(
      this.historyRepo.create({
        dealId: saved.id,
        stageId: stage.id,
        enteredAt: new Date(),
      }),
    );

    if (contacts.length > 0) {
      const activities = contacts.map((c) =>
        this.activitiesRepo.create({
          contactId: c.id,
          type: ActivityType.SYSTEM,
          content: `Nuevo negocio creado: "${saved.title}" por valor de ${saved.value} ${saved.currency}`,
          metadata: { dealId: saved.id, value: saved.value },
          createdBy: ActivityCreatedBy.SYSTEM,
        }),
      );
      await this.activitiesRepo.save(activities);
    }

    return saved;
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(
    business: Business,
    id: string,
    dto: UpdateDealDto,
  ): Promise<Deal> {
    const deal = await this.findOne(business, id);
    const patch = this.buildPatch(dto);

    if (dto.stageId && dto.stageId !== deal.stageId) {
      const pipelineId = (dto.pipelineId ?? deal.pipelineId) as string;
      await this.applyStageChange(deal, dto.stageId, pipelineId, patch);
    } else if (dto.stageId !== undefined) {
      patch.stageId = dto.stageId;
    }

    if (dto.contactIds) {
      const contacts =
        dto.contactIds.length > 0
          ? await this.contactsRepo.find({
              where: { id: In(dto.contactIds), businessId: business.id },
            })
          : [];
      // Updating ManyToMany manually via save
      deal.contacts = contacts;
      Object.assign(deal, patch);
      await this.dealsRepo.save(deal);
    } else {
      await this.dealsRepo.update(
        { id: deal.id, businessId: business.id },
        patch,
      );
    }

    return this.findOne(business, id);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Maps only the defined DTO fields into a type-safe entity partial. */
  private buildPatch(dto: UpdateDealDto): QueryDeepPartialEntity<Deal> {
    const patch: Record<string, unknown> = {};

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.value !== undefined) patch.value = dto.value;
    if (dto.currency !== undefined) patch.currency = dto.currency;
    if (dto.pipelineId !== undefined) patch.pipelineId = dto.pipelineId;
    if (dto.companyId !== undefined) patch.companyId = dto.companyId;
    if (dto.probability !== undefined) patch.probability = dto.probability;

    if (dto.description !== undefined)
      patch.description = dto.description ?? null;
    if (dto.assignedToId !== undefined)
      patch.assignedToId = dto.assignedToId ?? null;
    if (dto.teamId !== undefined) patch.teamId = dto.teamId ?? null;

    if (dto.expectedCloseDate !== undefined) {
      patch.expectedCloseDate = dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : null;
    }

    return patch as QueryDeepPartialEntity<Deal>;
  }

  /** Derives deal status and closedAt from the target stage type. */
  private deriveStatusFromStage(
    stage: PipelineStage,
  ): Pick<Deal, 'status' | 'closedAt'> {
    if (stage.type === PipelineStageType.WON)
      return { status: DealStatus.WON, closedAt: new Date() };
    if (stage.type === PipelineStageType.LOST)
      return { status: DealStatus.LOST, closedAt: new Date() };
    return { status: DealStatus.OPEN, closedAt: null };
  }

  /** Closes the currently open stage-history record for a deal. */
  private async closeCurrentHistory(dealId: string): Promise<void> {
    await this.historyRepo.update(
      { dealId, leftAt: IsNull() },
      { leftAt: new Date() },
    );
  }

  /** Creates a new stage-history record marking when the deal entered. */
  private async openNewHistory(dealId: string, stageId: string): Promise<void> {
    await this.historyRepo.save(
      this.historyRepo.create({
        dealId,
        stageId,
        enteredAt: new Date(),
      }),
    );
  }

  /** Logs a STAGE_CHANGE activity on the deal's contact timeline. */
  private async logStageChangeActivity(
    deal: Deal,
    fromStageId: string,
    toStage: PipelineStage,
  ): Promise<void> {
    if (deal.contacts && deal.contacts.length > 0) {
      const activities = deal.contacts.map((contact) =>
        this.activitiesRepo.create({
          contactId: contact.id,
          type: ActivityType.STAGE_CHANGE,
          content: `Negocio "${deal.title}": etapa cambiada a "${toStage.name}"`,
          metadata: { dealId: deal.id, from: fromStageId, to: toStage.id },
          createdBy: ActivityCreatedBy.USER,
        }),
      );
      await this.activitiesRepo.save(activities);
    }
  }

  /**
   * Orchestrates a full stage change: validates the target stage,
   * derives status, rotates history, and logs the activity.
   */
  private async applyStageChange(
    deal: Deal,
    newStageId: string,
    pipelineId: string,
    patch: QueryDeepPartialEntity<Deal>,
  ): Promise<void> {
    const newStage = await this.stageRepo.findOne({
      where: { id: newStageId, pipelineId },
    });
    if (!newStage)
      throw new BadRequestException(
        'La fase de destino no pertenece al pipeline del deal',
      );

    patch.stageId = newStage.id;
    Object.assign(patch, this.deriveStatusFromStage(newStage));

    await this.closeCurrentHistory(deal.id);
    await this.openNewHistory(deal.id, newStage.id);
    await this.logStageChangeActivity(deal, deal.stageId, newStage);
  }

  // ─── Remove ────────────────────────────────────────────────────────────────

  async remove(business: Business, id: string): Promise<void> {
    const deal = await this.findOne(business, id);
    await this.dealsRepo.softRemove(deal);
  }

  // ─── Kanban (por pipeline) ─────────────────────────────────────────────────

  async kanban(business: Business, pipelineId: string) {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id: pipelineId, businessId: business.id },
      relations: ['stages'],
      order: { stages: { position: 'ASC' } },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const deals = await this.dealsRepo.find({
      where: { businessId: business.id, pipelineId },
      relations: ['contacts', 'company', 'assignedTo', 'stage'],
      order: { updatedAt: 'DESC' },
    });

    const columns = pipeline.stages.map((stage) => ({
      stage,
      deals: deals.filter((d) => d.stageId === stage.id),
      total_value: deals
        .filter((d) => d.stageId === stage.id)
        .reduce((sum, d) => sum + Number(d.value), 0),
    }));

    return { pipeline, columns };
  }

  // ─── Stage History ─────────────────────────────────────────────────────────

  async stageHistory(
    business: Business,
    dealId: string,
  ): Promise<DealStageHistory[]> {
    await this.findOne(business, dealId);
    return this.historyRepo.find({
      where: { dealId },
      relations: ['stage'],
      order: { enteredAt: 'ASC' },
    });
  }
}
