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
      .leftJoinAndSelect('d.assigned_to', 'u')
      .leftJoinAndSelect('d.stage', 's')
      .where('d.business_id = :bid', { bid: business.id });

    if (query.pipelineId)
      qb.andWhere('d.pipeline_id = :pid', { pid: query.pipelineId });
    if (query.stageId) qb.andWhere('d.stage_id = :sid', { sid: query.stageId });
    if (query.status)
      qb.andWhere('d.status = :status', { status: query.status });
    if (query.contactId) {
      qb.innerJoin('d.contacts', 'contactFilter');
      qb.andWhere('contactFilter.id = :cid', { cid: query.contactId });
    }
    if (query.companyId)
      qb.andWhere('d.company_id = :compid', { compid: query.companyId });
    if (query.assignedToId)
      qb.andWhere('d.assigned_to_id = :uid', { uid: query.assignedToId });
    if (query.teamId) qb.andWhere('d.team_id = :tid', { tid: query.teamId });

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
      relations: [
        'contacts',
        'company',
        'assigned_to',
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
      where: { id: dto.pipelineId, business_id: business.id },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const stage = await this.stageRepo.findOne({
      where: { id: dto.stageId, pipeline_id: pipeline.id },
    });
    if (!stage)
      throw new BadRequestException(
        'La fase no pertenece al pipeline indicado',
      );

    const { status, closed_at } = this.deriveStatusFromStage(stage);

    const deal = this.dealsRepo.create({
      title: dto.title,
      description: dto.description,
      value: dto.value,
      currency: dto.currency,
      pipeline_id: dto.pipelineId,
      stage_id: dto.stageId,
      company_id: dto.companyId,
      assigned_to_id: dto.assignedToId,
      team_id: dto.teamId,
      expected_close_date: dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : null,
      probability: dto.probability,
      business_id: business.id,
      status,
      closed_at,
      contacts,
    });

    const saved = await this.dealsRepo.save(deal);

    await this.historyRepo.save(
      this.historyRepo.create({
        deal_id: saved.id,
        stage_id: stage.id,
        entered_at: new Date(),
      }),
    );

    if (contacts.length > 0) {
      const activities = contacts.map((c) =>
        this.activitiesRepo.create({
          contact_id: c.id,
          type: ActivityType.SYSTEM,
          content: `Nuevo negocio creado: "${saved.title}" por valor de ${saved.value} ${saved.currency}`,
          metadata: { deal_id: saved.id, value: saved.value },
          created_by: ActivityCreatedBy.SYSTEM,
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

    if (dto.stageId && dto.stageId !== deal.stage_id) {
      const pipelineId = (dto.pipelineId ?? deal.pipeline_id) as string;
      await this.applyStageChange(deal, dto.stageId, pipelineId, patch);
    } else if (dto.stageId !== undefined) {
      patch.stage_id = dto.stageId;
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
        { id: deal.id, business_id: business.id },
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
    if (dto.pipelineId !== undefined) patch.pipeline_id = dto.pipelineId;
    if (dto.companyId !== undefined) patch.company_id = dto.companyId;
    if (dto.probability !== undefined) patch.probability = dto.probability;

    if (dto.description !== undefined)
      patch.description = dto.description ?? null;
    if (dto.assignedToId !== undefined)
      patch.assigned_to_id = dto.assignedToId ?? null;
    if (dto.teamId !== undefined) patch.team_id = dto.teamId ?? null;

    if (dto.expectedCloseDate !== undefined) {
      patch.expected_close_date = dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : null;
    }

    return patch as QueryDeepPartialEntity<Deal>;
  }

  /** Derives deal status and closed_at from the target stage type. */
  private deriveStatusFromStage(
    stage: PipelineStage,
  ): Pick<Deal, 'status' | 'closed_at'> {
    if (stage.type === PipelineStageType.WON)
      return { status: DealStatus.WON, closed_at: new Date() };
    if (stage.type === PipelineStageType.LOST)
      return { status: DealStatus.LOST, closed_at: new Date() };
    return { status: DealStatus.OPEN, closed_at: null };
  }

  /** Closes the currently open stage-history record for a deal. */
  private async closeCurrentHistory(dealId: string): Promise<void> {
    await this.historyRepo.update(
      { deal_id: dealId, left_at: IsNull() },
      { left_at: new Date() },
    );
  }

  /** Creates a new stage-history record marking when the deal entered. */
  private async openNewHistory(dealId: string, stageId: string): Promise<void> {
    await this.historyRepo.save(
      this.historyRepo.create({
        deal_id: dealId,
        stage_id: stageId,
        entered_at: new Date(),
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
          contact_id: contact.id,
          type: ActivityType.STAGE_CHANGE,
          content: `Negocio "${deal.title}": etapa cambiada a "${toStage.name}"`,
          metadata: { deal_id: deal.id, from: fromStageId, to: toStage.id },
          created_by: ActivityCreatedBy.USER,
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
      where: { id: newStageId, pipeline_id: pipelineId },
    });
    if (!newStage)
      throw new BadRequestException(
        'La fase de destino no pertenece al pipeline del deal',
      );

    patch.stage_id = newStage.id;
    Object.assign(patch, this.deriveStatusFromStage(newStage));

    await this.closeCurrentHistory(deal.id);
    await this.openNewHistory(deal.id, newStage.id);
    await this.logStageChangeActivity(deal, deal.stage_id, newStage);
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
      where: { business_id: business.id, pipeline_id: pipelineId },
      relations: ['contacts', 'company', 'assigned_to', 'stage'],
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

  async stageHistory(
    business: Business,
    dealId: string,
  ): Promise<DealStageHistory[]> {
    await this.findOne(business, dealId);
    return this.historyRepo.find({
      where: { deal_id: dealId },
      relations: ['stage'],
      order: { entered_at: 'ASC' },
    });
  }
}
