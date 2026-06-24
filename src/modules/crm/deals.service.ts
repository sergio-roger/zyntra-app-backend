import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, IsNull } from 'typeorm';
import { Deal } from '@crm/entities/deal.entity';
import { Contact } from '@crm/entities/contact.entity';
import { ContactActivity } from '@crm/entities/contact-activity.entity';
import { Pipeline } from '@crm/entities/pipeline.entity';
import { PipelineStage } from '@crm/entities/pipeline-stage.entity';
import { DealStageHistory } from '@crm/entities/deal-stage-history.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateDealDto, UpdateDealDto, ListDealsDto } from '@crm/dto/deal.dto';
import { ActivityType } from '@crm/enums/activity-type.enum';
import { ActivityCreatedBy } from '@crm/enums/activity-created-by.enum';
import { DealStatus } from '@crm/enums/deal-status.enum';
import { PipelineStageType } from '@crm/enums/pipeline-stage-type.enum';

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
      .leftJoinAndSelect('d.contact', 'c')
      .leftJoinAndSelect('d.assigned_to', 'u')
      .leftJoinAndSelect('d.stage', 's')
      .where('d.business_id = :bid', { bid: business.id });

    if (query.pipeline_id)
      qb.andWhere('d.pipeline_id = :pid', { pid: query.pipeline_id });
    if (query.stage_id)
      qb.andWhere('d.stage_id = :sid', { sid: query.stage_id });
    if (query.status)
      qb.andWhere('d.status = :status', { status: query.status });
    if (query.contact_id)
      qb.andWhere('d.contact_id = :cid', { cid: query.contact_id });
    if (query.assigned_to_id)
      qb.andWhere('d.assigned_to_id = :uid', { uid: query.assigned_to_id });
    if (query.team_id)
      qb.andWhere('d.team_id = :tid', { tid: query.team_id });

    if (query.search) {
      qb.andWhere(
        new Brackets((q) => {
          q.where('d.title ILIKE :s', { s: `%${query.search}%` }).orWhere(
            'c.name ILIKE :s',
            { s: `%${query.search}%` },
          );
        }),
      );
    }

    qb.orderBy('d.updated_at', 'DESC')
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
      where: { id, business_id: business.id },
      relations: ['contact', 'assigned_to', 'team', 'stage', 'pipeline'],
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(business: Business, dto: CreateDealDto): Promise<Deal> {
    const contact = await this.contactsRepo.findOne({
      where: { id: dto.contact_id, business_id: business.id },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    const pipeline = await this.pipelineRepo.findOne({
      where: { id: dto.pipeline_id, business_id: business.id },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const stage = await this.stageRepo.findOne({
      where: { id: dto.stage_id, pipeline_id: pipeline.id },
    });
    if (!stage)
      throw new BadRequestException(
        'La fase no pertenece al pipeline indicado',
      );

    const deal = this.dealsRepo.create({
      ...dto,
      business_id: business.id,
      status: stage.type === PipelineStageType.WON
        ? DealStatus.WON
        : stage.type === PipelineStageType.LOST
        ? DealStatus.LOST
        : DealStatus.OPEN,
      closed_at:
        stage.type !== PipelineStageType.ACTIVE ? new Date() : undefined,
    });

    const saved = await this.dealsRepo.save(deal);

    await this.historyRepo.save(
      this.historyRepo.create({
        deal_id: saved.id,
        stage_id: stage.id,
        entered_at: new Date(),
      }),
    );

    await this.activitiesRepo.save(
      this.activitiesRepo.create({
        contact_id: contact.id,
        type: ActivityType.SYSTEM,
        content: `Nuevo negocio creado: "${saved.title}" por valor de ${saved.value} ${saved.currency}`,
        metadata: { deal_id: saved.id, value: saved.value },
        created_by: ActivityCreatedBy.SYSTEM,
      }),
    );

    return saved;
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(
    business: Business,
    id: string,
    dto: UpdateDealDto,
  ): Promise<Deal> {
    const deal = await this.findOne(business, id);
    const previousStageId = deal.stage_id;

    if (dto.stage_id && dto.stage_id !== previousStageId) {
      const targetPipelineId = dto.pipeline_id ?? deal.pipeline_id;

      const newStage = await this.stageRepo.findOne({
        where: { id: dto.stage_id, pipeline_id: targetPipelineId },
      });
      if (!newStage)
        throw new BadRequestException(
          'La fase de destino no pertenece al pipeline del deal',
        );

      await this.historyRepo.update(
        { deal_id: deal.id, left_at: IsNull() },
        { left_at: new Date() },
      );

      await this.historyRepo.save(
        this.historyRepo.create({
          deal_id: deal.id,
          stage_id: newStage.id,
          entered_at: new Date(),
        }),
      );

      if (newStage.type === PipelineStageType.WON) {
        deal.status = DealStatus.WON;
        deal.closed_at = new Date();
      } else if (newStage.type === PipelineStageType.LOST) {
        deal.status = DealStatus.LOST;
        deal.closed_at = new Date();
      } else {
        deal.status = DealStatus.OPEN;
        deal.closed_at = null;
      }

      await this.activitiesRepo.save(
        this.activitiesRepo.create({
          contact_id: deal.contact_id,
          type: ActivityType.STAGE_CHANGE,
          content: `Negocio "${deal.title}": etapa cambiada a "${newStage.name}"`,
          metadata: { deal_id: deal.id, from: previousStageId, to: newStage.id },
          created_by: ActivityCreatedBy.USER,
        }),
      );
    }

    Object.assign(deal, dto);
    return this.dealsRepo.save(deal);
  }

  // ─── Remove ────────────────────────────────────────────────────────────────

  async remove(business: Business, id: string): Promise<void> {
    const deal = await this.findOne(business, id);
    await this.dealsRepo.softRemove(deal);
  }

  // ─── Kanban (por pipeline) ─────────────────────────────────────────────────

  async kanban(business: Business, pipelineId: string) {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id: pipelineId, business_id: business.id },
      relations: ['stages'],
      order: { stages: { position: 'ASC' } },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const deals = await this.dealsRepo.find({
      where: { business_id: business.id, pipeline_id: pipelineId, status: DealStatus.OPEN },
      relations: ['contact', 'assigned_to', 'stage'],
      order: { updated_at: 'DESC' },
    });

    const columns = pipeline.stages.map((stage) => ({
      stage,
      deals: deals.filter((d) => d.stage_id === stage.id),
      total_value: deals
        .filter((d) => d.stage_id === stage.id)
        .reduce((sum, d) => sum + Number(d.value), 0),
    }));

    return { pipeline, columns };
  }

  // ─── Stage History ─────────────────────────────────────────────────────────

  async stageHistory(business: Business, dealId: string): Promise<DealStageHistory[]> {
    await this.findOne(business, dealId);
    return this.historyRepo.find({
      where: { deal_id: dealId },
      relations: ['stage'],
      order: { entered_at: 'ASC' },
    });
  }
}
