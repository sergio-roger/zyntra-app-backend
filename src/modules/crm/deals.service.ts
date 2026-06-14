import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Deal } from '@crm/entities/deal.entity';
import { Contact } from '@crm/entities/contact.entity';
import { ContactActivity } from '@crm/entities/contact-activity.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateDealDto, UpdateDealDto, ListDealsDto } from '@crm/dto/deal.dto';
import { ActivityType } from '@crm/enums/activity-type.enum';
import { ActivityCreatedBy } from '@crm/enums/activity-created-by.enum';
import { DealStage } from '@crm/enums/deal-stage.enum';
import { DealStatus } from '@crm/enums/deal-status.enum';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealsRepo: Repository<Deal>,
    @InjectRepository(Contact)
    private readonly contactsRepo: Repository<Contact>,
    @InjectRepository(ContactActivity)
    private readonly activitiesRepo: Repository<ContactActivity>,
  ) {}

  async list(business: Business, query: ListDealsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.dealsRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.contact', 'c')
      .leftJoinAndSelect('d.assigned_to', 'u')
      .where('d.business_id = :bid', { bid: business.id });

    if (query.stage) qb.andWhere('d.stage = :stage', { stage: query.stage });
    if (query.status)
      qb.andWhere('d.status = :status', { status: query.status });
    if (query.contact_id)
      qb.andWhere('d.contact_id = :cid', { cid: query.contact_id });
    if (query.assigned_to_id)
      qb.andWhere('d.assigned_to_id = :uid', { uid: query.assigned_to_id });

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

  async findOne(business: Business, id: string): Promise<Deal> {
    const deal = await this.dealsRepo.findOne({
      where: { id, business_id: business.id },
      relations: ['contact', 'assigned_to', 'team'],
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async create(business: Business, dto: CreateDealDto): Promise<Deal> {
    // Verify contact exists and belongs to business
    const contact = await this.contactsRepo.findOne({
      where: { id: dto.contact_id, business_id: business.id },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    const deal = this.dealsRepo.create({
      ...dto,
      business_id: business.id,
    });

    const saved = await this.dealsRepo.save(deal);

    // Log activity on contact
    await this.activitiesRepo.save(
      this.activitiesRepo.create({
        contact_id: contact.id,
        type: ActivityType.SYSTEM,
        content: `Nuevo negocio creado: "${saved.title}" por valor de ${saved.value}`,
        metadata: { deal_id: saved.id, value: saved.value },
        created_by: ActivityCreatedBy.SYSTEM,
      }),
    );

    return saved;
  }

  async update(
    business: Business,
    id: string,
    dto: UpdateDealDto,
  ): Promise<Deal> {
    const deal = await this.findOne(business, id);
    const previousStage = deal.stage;
    const previousStatus = deal.status;

    Object.assign(deal, dto);
    const saved = await this.dealsRepo.save(deal);

    // Log activity if stage changed
    if (dto.stage && dto.stage !== previousStage) {
      await this.activitiesRepo.save(
        this.activitiesRepo.create({
          contact_id: saved.contact_id,
          type: ActivityType.STAGE_CHANGE,
          content: `Negocio "${saved.title}": etapa cambiada de "${previousStage}" a "${dto.stage}"`,
          metadata: { deal_id: saved.id, from: previousStage, to: dto.stage },
          created_by: ActivityCreatedBy.USER,
        }),
      );
    }

    // Log activity if status changed (Won/Lost)
    if (dto.status && dto.status !== previousStatus) {
      await this.activitiesRepo.save(
        this.activitiesRepo.create({
          contact_id: saved.contact_id,
          type: ActivityType.SYSTEM,
          content: `Negocio "${saved.title}" marcado como ${dto.status.toUpperCase()}`,
          metadata: { deal_id: saved.id, status: dto.status },
          created_by: ActivityCreatedBy.SYSTEM,
        }),
      );
    }

    return saved;
  }

  async remove(business: Business, id: string): Promise<void> {
    const deal = await this.findOne(business, id);
    await this.dealsRepo.remove(deal);
  }

  async kanban(business: Business): Promise<Record<DealStage, Deal[]>> {
    const deals = await this.dealsRepo.find({
      where: { business_id: business.id, status: DealStatus.OPEN }, // Only open deals in kanban
      relations: ['contact', 'assigned_to'],
      order: { updated_at: 'DESC' },
    });

    const result = Object.values(DealStage).reduce<Record<string, Deal[]>>(
      (acc, stage) => {
        acc[stage] = [];
        return acc;
      },
      {},
    );

    for (const deal of deals) {
      if (result[deal.stage]) {
        result[deal.stage].push(deal);
      }
    }

    return result;
  }
}
