import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Pipeline } from '@crm/entities/pipeline.entity';
import { PipelineStage } from '@crm/entities/pipeline-stage.entity';
import { Deal } from '@crm/entities/deal.entity';
import { Business } from '@auth/entities/business.entity';
import { PipelineStageType } from '@crm/enums/pipeline-stage-type.enum';
import { DealStatus } from '@crm/enums/deal-status.enum';
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  CreateStageDto,
  UpdateStageDto,
  ReorderStagesDto,
} from '@crm/dto/pipeline.dto';

@Injectable()
export class PipelinesService {
  constructor(
    @InjectRepository(Pipeline)
    private readonly pipelineRepo: Repository<Pipeline>,
    @InjectRepository(PipelineStage)
    private readonly stageRepo: Repository<PipelineStage>,
    @InjectRepository(Deal)
    private readonly dealRepo: Repository<Deal>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Pipelines ─────────────────────────────────────────────────────────────

  async list(business: Business): Promise<Pipeline[]> {
    return this.pipelineRepo.find({
      where: { business_id: business.id },
      relations: ['stages'],
      order: { position: 'ASC', stages: { position: 'ASC' } },
    });
  }

  async findOne(business: Business, id: string): Promise<Pipeline> {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id, business_id: business.id },
      relations: ['stages'],
      order: { stages: { position: 'ASC' } },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  async create(business: Business, dto: CreatePipelineDto): Promise<Pipeline> {
    if (dto.is_default) {
      await this.pipelineRepo.update(
        { business_id: business.id },
        { is_default: false },
      );
    }

    const pipeline = this.pipelineRepo.create({
      ...dto,
      business_id: business.id,
    });
    const saved = await this.pipelineRepo.save(pipeline);

    const defaultStages = [
      { name: 'Prospección',  color: '#4f46e5', position: 0, type: PipelineStageType.ACTIVE, probability_percent: 10  },
      { name: 'Contactado',   color: '#06b6d4', position: 1, type: PipelineStageType.ACTIVE, probability_percent: 20  },
      { name: 'Propuesta',    color: '#f59e0b', position: 2, type: PipelineStageType.ACTIVE, probability_percent: 40  },
      { name: 'Negociación',  color: '#8b5cf6', position: 3, type: PipelineStageType.ACTIVE, probability_percent: 60  },
      { name: 'Ganado',       color: '#10b981', position: 4, type: PipelineStageType.WON,    probability_percent: 100 },
      { name: 'Perdido',      color: '#ef4444', position: 5, type: PipelineStageType.LOST,   probability_percent: 0   },
    ];

    await this.stageRepo.save(
      defaultStages.map((s) => this.stageRepo.create({ ...s, pipeline_id: saved.id })),
    );

    return this.findOne(business, saved.id);
  }

  async update(
    business: Business,
    id: string,
    dto: UpdatePipelineDto,
  ): Promise<Pipeline> {
    const pipeline = await this.findOne(business, id);

    if (dto.is_default) {
      await this.pipelineRepo.update(
        { business_id: business.id },
        { is_default: false },
      );
    }

    Object.assign(pipeline, dto);
    return this.pipelineRepo.save(pipeline);
  }

  async softDelete(business: Business, id: string): Promise<void> {
    const pipeline = await this.findOne(business, id);

    const activeDealsCount = await this.dealRepo
      .createQueryBuilder('d')
      .where('d.pipeline_id = :pid', { pid: pipeline.id })
      .andWhere('d.status = :status', { status: DealStatus.OPEN })
      .andWhere('d.deleted_at IS NULL')
      .getCount();

    if (activeDealsCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el pipeline "${pipeline.name}" porque tiene ${activeDealsCount} oportunidad(es) activa(s). Mueve o cierra los deals primero.`,
      );
    }

    await this.pipelineRepo.softRemove(pipeline);
  }

  // ─── Stages ────────────────────────────────────────────────────────────────

  async listStages(business: Business, pipelineId: string): Promise<PipelineStage[]> {
    await this.findOne(business, pipelineId);
    return this.stageRepo.find({
      where: { pipeline_id: pipelineId },
      order: { position: 'ASC' },
    });
  }

  async createStage(
    business: Business,
    pipelineId: string,
    dto: CreateStageDto,
  ): Promise<PipelineStage> {
    await this.findOne(business, pipelineId);

    const stage = this.stageRepo.create({
      ...dto,
      pipeline_id: pipelineId,
    });
    return this.stageRepo.save(stage);
  }

  async updateStage(
    business: Business,
    stageId: string,
    dto: UpdateStageDto,
  ): Promise<PipelineStage> {
    const stage = await this.stageRepo.findOne({
      where: { id: stageId },
      relations: ['pipeline'],
    });
    if (!stage || stage.pipeline.business_id !== business.id) {
      throw new NotFoundException('Stage not found');
    }

    Object.assign(stage, dto);
    return this.stageRepo.save(stage);
  }

  async deleteStage(business: Business, stageId: string): Promise<void> {
    const stage = await this.stageRepo.findOne({
      where: { id: stageId },
      relations: ['pipeline'],
    });
    if (!stage || stage.pipeline.business_id !== business.id) {
      throw new NotFoundException('Stage not found');
    }

    const dealsCount = await this.dealRepo.count({
      where: { stage_id: stageId },
    });
    if (dealsCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la etapa "${stage.name}" porque tiene ${dealsCount} negocio(s) asignado(s).`,
      );
    }

    await this.stageRepo.remove(stage);
  }

  async reorderStages(
    business: Business,
    pipelineId: string,
    dto: ReorderStagesDto,
  ): Promise<PipelineStage[]> {
    const pipeline = await this.findOne(business, pipelineId);

    const stageIds = dto.stages.map((s) => s.id);
    const stages = await this.stageRepo.find({
      where: dto.stages.map((s) => ({ id: s.id, pipeline_id: pipeline.id })),
    });

    if (stages.length !== stageIds.length) {
      throw new BadRequestException(
        'Uno o más IDs de fase no pertenecen a este pipeline',
      );
    }

    await this.dataSource.transaction(async (em) => {
      for (const item of dto.stages) {
        await em.update(PipelineStage, { id: item.id }, { position: item.position });
      }
    });

    return this.listStages(business, pipelineId);
  }

  // ─── Forecasting ───────────────────────────────────────────────────────────

  async forecast(business: Business, pipelineId: string) {
    await this.findOne(business, pipelineId);

    const rows = await this.dealRepo
      .createQueryBuilder('d')
      .innerJoin('d.stage', 's')
      .select([
        `TO_CHAR(d.expected_close_date, 'YYYY-MM') AS month`,
        `SUM(d.value) AS total_value`,
        `SUM(d.value * s.probability_percent / 100.0) AS weighted_value`,
        `COUNT(d.id)::int AS deal_count`,
        `d.currency AS currency`,
      ])
      .where('d.pipeline_id = :pid', { pid: pipelineId })
      .andWhere('d.business_id = :bid', { bid: business.id })
      .andWhere('d.status = :status', { status: DealStatus.OPEN })
      .andWhere('d.deleted_at IS NULL')
      .andWhere('d.expected_close_date IS NOT NULL')
      .groupBy(`TO_CHAR(d.expected_close_date, 'YYYY-MM'), d.currency`)
      .orderBy(`TO_CHAR(d.expected_close_date, 'YYYY-MM')`, 'ASC')
      .getRawMany();

    const totalsRow = await this.dealRepo
      .createQueryBuilder('d')
      .innerJoin('d.stage', 's')
      .select([
        `SUM(d.value) AS total_value`,
        `SUM(d.value * s.probability_percent / 100.0) AS weighted_value`,
        `COUNT(d.id)::int AS deal_count`,
      ])
      .where('d.pipeline_id = :pid', { pid: pipelineId })
      .andWhere('d.business_id = :bid', { bid: business.id })
      .andWhere('d.status = :status', { status: DealStatus.OPEN })
      .andWhere('d.deleted_at IS NULL')
      .getRawOne();

    return {
      pipeline_id: pipelineId,
      totals: {
        total_value: parseFloat(totalsRow?.total_value ?? '0'),
        weighted_value: parseFloat(totalsRow?.weighted_value ?? '0'),
        deal_count: totalsRow?.deal_count ?? 0,
      },
      by_month: rows.map((r) => ({
        month: r.month,
        currency: r.currency,
        total_value: parseFloat(r.total_value),
        weighted_value: parseFloat(r.weighted_value),
        deal_count: r.deal_count,
      })),
    };
  }
}
