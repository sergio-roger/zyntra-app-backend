import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Contact } from '@crm/entities/contact.entity';
import { Tag } from '@crm/entities/tag.entity';
import { ContactActivity } from '@crm/entities/contact-activity.entity';
import { Deal } from '@crm/entities/deal.entity';
import { CrmUser } from '@crm/entities/user.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateContactDto } from '@crm/dto/create-contact.dto';
import { UpdateContactDto } from '@crm/dto/update-contact.dto';
import { ListContactsDto } from '@crm/dto/list-contacts.dto';
import { CreateActivityDto } from '@crm/dto/create-activity.dto';
import { ConvertToDealDto } from '@crm/dto/deal.dto';
import { ContactStage } from '@crm/enums/contact-stage.enum';
import { ActivityType } from '@crm/enums/activity-type.enum';
import { ActivityCreatedBy } from '@crm/enums/activity-created-by.enum';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactsRepo: Repository<Contact>,
    @InjectRepository(ContactActivity)
    private readonly activitiesRepo: Repository<ContactActivity>,
    @InjectRepository(Deal)
    private readonly dealsRepo: Repository<Deal>,
    @InjectRepository(CrmUser)
    private readonly crmUsersRepo: Repository<CrmUser>,
  ) {}

  async listMembers(
    business: Business,
  ): Promise<{ id: string; name: string }[]> {
    return this.crmUsersRepo.find({
      where: { business_id: business.id, is_active: true },
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
  }

  async list(business: Business, query: ListContactsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.contactsRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.tags', 't')
      .leftJoinAndSelect('c.lifecycle_stage', 'ls')
      .leftJoinAndSelect('c.owner', 'o')
      .where('c.business_id = :bid', { bid: business.id });

    if (query.stage) qb.andWhere('c.stage = :stage', { stage: query.stage });
    if (query.source)
      qb.andWhere('c.source = :source', { source: query.source });
    if (query.tag) qb.andWhere('t.id = :tagId', { tagId: query.tag });
    if (query.ownerId === 'unassigned') {
      qb.andWhere('c.owner_id IS NULL');
    } else if (query.ownerId) {
      qb.andWhere('c.owner_id = :ownerId', { ownerId: query.ownerId });
    }
    if (query.is_archived !== undefined) {
      qb.andWhere('c.is_archived = :isArchived', {
        isArchived: query.is_archived,
      });
    }
    if (query.search) {
      qb.andWhere(
        new Brackets((q) => {
          q.where('c.name ILIKE :s', { s: `%${query.search}%` })
            .orWhere('c.email ILIKE :s', { s: `%${query.search}%` })
            .orWhere('c.phone ILIKE :s', { s: `%${query.search}%` });
        }),
      );
    }

    qb.orderBy('c.updated_at', 'DESC')
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

  async pipeline(business: Business): Promise<Record<ContactStage, number>> {
    const rows: Array<{ stage: ContactStage; count: string }> =
      await this.contactsRepo
        .createQueryBuilder('c')
        .select('c.stage', 'stage')
        .addSelect('COUNT(*)', 'count')
        .where('c.business_id = :bid', { bid: business.id })
        .groupBy('c.stage')
        .getRawMany();

    const result = Object.values(ContactStage).reduce<Record<string, number>>(
      (acc, stage) => {
        acc[stage] = 0;
        return acc;
      },
      {},
    );
    for (const row of rows) result[row.stage] = Number(row.count);
    return result;
  }

  async kanban(business: Business): Promise<Record<ContactStage, Contact[]>> {
    const contacts = await this.contactsRepo.find({
      where: { business_id: business.id },
      relations: ['tags', 'lifecycle_stage'],
      order: { updated_at: 'DESC' },
    });

    const result = Object.values(ContactStage).reduce<
      Record<string, Contact[]>
    >((acc, stage) => {
      acc[stage] = [];
      return acc;
    }, {});

    for (const contact of contacts) {
      if (contact.stage && result[contact.stage]) {
        result[contact.stage].push(contact);
      }
    }

    return result;
  }

  async findOne(business: Business, id: string): Promise<Contact> {
    const contact = await this.contactsRepo.findOne({
      where: { id, business_id: business.id },
      relations: ['tags', 'lifecycle_stage', 'owner'],
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(
    business: Business,
    dto: CreateContactDto,
    currentUserId?: string | null,
  ): Promise<Contact> {
    await this.assertWithinPlanLimit(business);

    const { tags, stage, owner_id, ...contactData } = dto;
    const contact = this.contactsRepo.create({
      ...contactData,
      business_id: business.id,
      owner_id: owner_id ?? currentUserId ?? null,
      tags: tags ? tags.map((id) => ({ id }) as Tag) : [],
      last_activity_at: new Date(),
      stage: stage ?? null,
    });
    return this.contactsRepo.save(contact);
  }

  async update(
    business: Business,
    id: string,
    dto: UpdateContactDto,
  ): Promise<Contact> {
    const contact = await this.findOne(business, id);
    const previousStage = contact.stage;

    // Handle tags if present
    if (dto.tags) {
      contact.tags = dto.tags.map((id) => ({ id }) as Tag);
      delete dto.tags;
    }

    Object.assign(contact, dto);
    contact.last_activity_at = new Date();
    const saved = await this.contactsRepo.save(contact);

    if (dto.stage && dto.stage !== previousStage) {
      await this.activitiesRepo.save(
        this.activitiesRepo.create({
          contact_id: saved.id,
          type: ActivityType.STAGE_CHANGE,
          content: `Stage changed from "${previousStage}" to "${dto.stage}"`,
          metadata: { from: previousStage, to: dto.stage },
          created_by: ActivityCreatedBy.USER,
        }),
      );
    }

    return saved;
  }

  async remove(business: Business, id: string): Promise<void> {
    const contact = await this.findOne(business, id);
    await this.contactsRepo.softRemove(contact);
  }

  async listActivities(
    business: Business,
    contactId: string,
    page = 1,
    limit = 20,
    type?: ActivityType,
  ) {
    await this.findOne(business, contactId); // tenant isolation

    const qb = this.activitiesRepo
      .createQueryBuilder('a')
      .where('a.contact_id = :cid', { cid: contactId });
    if (type) qb.andWhere('a.type = :type', { type });

    qb.orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async addActivity(
    business: Business,
    contactId: string,
    dto: CreateActivityDto,
  ): Promise<ContactActivity> {
    const contact = await this.findOne(business, contactId);

    const activity = await this.activitiesRepo.save(
      this.activitiesRepo.create({
        contact_id: contact.id,
        type: dto.type,
        content: dto.content,
        metadata: dto.metadata ?? {},
        created_by: ActivityCreatedBy.USER,
      }),
    );

    contact.last_activity_at = new Date();
    await this.contactsRepo.save(contact);

    return activity;
  }

  async archive(business: Business, id: string): Promise<Contact> {
    const contact = await this.findOne(business, id);
    contact.is_archived = true;
    contact.last_activity_at = new Date();
    await this.activitiesRepo.save(
      this.activitiesRepo.create({
        contact_id: contact.id,
        type: ActivityType.SYSTEM,
        content: 'Lead archivado',
        metadata: {},
        created_by: ActivityCreatedBy.SYSTEM,
      }),
    );
    return this.contactsRepo.save(contact);
  }

  async convertToDeal(
    business: Business,
    id: string,
    dto: ConvertToDealDto,
  ): Promise<Deal> {
    const contact = await this.findOne(business, id);

    const deal = this.dealsRepo.create({
      business_id: business.id,
      contact_id: contact.id,
      title: dto.title,
      value: dto.value ?? 0,
      pipeline_id: dto.pipeline_id,
      stage_id: dto.stage_id,
      expected_close_date: dto.expected_close_date
        ? new Date(dto.expected_close_date)
        : null,
      description: dto.description,
    });
    const savedDeal = await this.dealsRepo.save(deal);

    contact.stage = ContactStage.PROSPECT;
    contact.last_activity_at = new Date();
    await this.contactsRepo.save(contact);

    await this.activitiesRepo.save(
      this.activitiesRepo.create({
        contact_id: contact.id,
        type: ActivityType.SYSTEM,
        content: `Lead convertido a negocio: "${savedDeal.title}"`,
        metadata: { deal_id: savedDeal.id },
        created_by: ActivityCreatedBy.SYSTEM,
      }),
    );

    return savedDeal;
  }

  async import(
    business: Business,
    contacts: CreateContactDto[],
  ): Promise<{ count: number }> {
    await this.assertWithinPlanLimit(business, contacts.length);

    const entities = contacts.map((dto) =>
      this.contactsRepo.create({
        ...dto,
        business_id: business.id,
        tags: dto.tags ? dto.tags.map((id) => ({ id }) as Tag) : [],
        last_activity_at: new Date(),
      }),
    );

    // Save in batches for performance
    const batchSize = 100;
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      await this.contactsRepo.save(batch);
    }

    return { count: entities.length };
  }

  private async assertWithinPlanLimit(
    business: Business,
    newCount = 1,
  ): Promise<void> {
    const limit = business.plan_object?.contact_limit;
    if (limit === undefined || limit === null || limit === 999999) return;

    const currentCount = await this.contactsRepo.count({
      where: { business_id: business.id },
    });

    if (currentCount + newCount > limit) {
      const planName = business.plan_object?.name || 'actual';
      throw new HttpException(
        {
          code: 'plan_limit_reached',
          resource: 'contacts',
          limit,
          current: currentCount,
          new: newCount,
          message: `Tu plan "${planName}" permite hasta ${limit} contactos. Intentas añadir ${newCount}, pero ya tienes ${currentCount}.`,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }
}
