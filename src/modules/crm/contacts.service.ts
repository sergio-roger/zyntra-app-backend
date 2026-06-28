import { Business } from '@auth/entities/business.entity';
import { CreateActivityDto } from '@crm/dto/create-activity.dto';
import { CreateContactDto } from '@crm/dto/create-contact.dto';
import { ConvertToDealDto } from '@crm/dto/deal.dto';
import {
  ExportColumnDto,
  ExportContactsDto,
} from '@crm/dto/export-contacts.dto';
import { ListContactsDto } from '@crm/dto/list-contacts.dto';
import { UpdateContactDto } from '@crm/dto/update-contact.dto';
import { ContactActivity } from '@crm/entities/contact-activity.entity';
import { Contact } from '@crm/entities/contact.entity';
import { Deal } from '@crm/entities/deal.entity';
import { Tag } from '@crm/entities/tag.entity';
import { CrmUser } from '@crm/entities/user.entity';
import { ActivityCreatedBy } from '@crm/enums/activity-created-by.enum';
import { ActivityType } from '@crm/enums/activity-type.enum';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { stringify } from 'csv-stringify/sync';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

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

    const qb = this.buildContactQuery(business.id);
    this.applyContactFilters(qb, query);
    qb.orderBy('c.updatedAt', 'DESC')
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

  private buildContactQuery(businessId: string): SelectQueryBuilder<Contact> {
    return this.contactsRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.tags', 't')
      .leftJoinAndSelect('c.lifecycleStage', 'ls')
      .leftJoinAndSelect('c.owner', 'o')
      .leftJoinAndSelect('c.company', 'emp')
      .where('c.businessId = :bid', { bid: businessId });
  }

  private applyContactFilters(
    qb: SelectQueryBuilder<Contact>,
    filters: {
      search?: string;
      source?: string;
      ownerId?: string;
      lifecycleStageId?: string;
      tag?: string;
      isArchived?: boolean;
      createdAtFrom?: string;
      createdAtTo?: string;
      lastActivityAtFrom?: string;
      lastActivityAtTo?: string;
      customFieldFilters?: string;
    },
  ): void {
    if (filters.lifecycleStageId)
      qb.andWhere('c.lifecycleStageId = :lifecycleStageId', {
        lifecycleStageId: filters.lifecycleStageId,
      });
    if (filters.source)
      qb.andWhere('c.source = :source', { source: filters.source });
    if (filters.tag) qb.andWhere('t.id = :tagId', { tagId: filters.tag });
    if (filters.ownerId === 'unassigned') {
      qb.andWhere('c.ownerId IS NULL');
    } else if (filters.ownerId) {
      qb.andWhere('c.ownerId = :ownerId', { ownerId: filters.ownerId });
    }
    if (filters.isArchived !== undefined)
      qb.andWhere('c.isArchived = :isArchived', {
        isArchived: filters.isArchived,
      });
    if (filters.search)
      qb.andWhere(
        new Brackets((q) =>
          q
            .where('c.name ILIKE :s', { s: `%${filters.search}%` })
            .orWhere('c.email ILIKE :s', { s: `%${filters.search}%` })
            .orWhere('c.phone ILIKE :s', { s: `%${filters.search}%` }),
        ),
      );
    if (filters.createdAtFrom)
      qb.andWhere('c.createdAt >= :createdAtFrom', {
        createdAtFrom: filters.createdAtFrom,
      });
    if (filters.createdAtTo)
      qb.andWhere('c.createdAt <= :createdAtTo', {
        createdAtTo: filters.createdAtTo,
      });
    if (filters.lastActivityAtFrom)
      qb.andWhere('c.lastActivityAt >= :lastActivityAtFrom', {
        lastActivityAtFrom: filters.lastActivityAtFrom,
      });
    if (filters.lastActivityAtTo)
      qb.andWhere('c.lastActivityAt <= :lastActivityAtTo', {
        lastActivityAtTo: filters.lastActivityAtTo,
      });
    if (filters.customFieldFilters)
      this.applyCustomFieldFilters(qb, filters.customFieldFilters);
  }

  private applyCustomFieldFilters(
    qb: SelectQueryBuilder<Contact>,
    rawJson: string,
  ): void {
    try {
      const conditions = JSON.parse(rawJson) as Array<{
        field: string;
        operator: string;
        value: unknown;
      }>;
      conditions.forEach((cond, idx) => {
        const col = cond.field
          .replace('customFields.', '')
          .replace('custom_fields.', '')
          .replace(/[^a-z0-9_]/gi, '');
        if (!col) return;
        const key = `cf_${idx}`;
        switch (cond.operator) {
          case 'equals':
            qb.andWhere(`c.custom_fields->>'${col}' = :${key}`, {
              [key]: String(cond.value),
            });
            break;
          case 'not_equals':
            qb.andWhere(`c.custom_fields->>'${col}' != :${key}`, {
              [key]: String(cond.value),
            });
            break;
          case 'contains':
            qb.andWhere(`c.custom_fields->>'${col}' ILIKE :${key}`, {
              [key]: `%${String(cond.value)}%`,
            });
            break;
          case 'greater_than':
            qb.andWhere(`(c.custom_fields->>'${col}')::numeric > :${key}`, {
              [key]: Number(cond.value),
            });
            break;
          case 'less_than':
            qb.andWhere(`(c.custom_fields->>'${col}')::numeric < :${key}`, {
              [key]: Number(cond.value),
            });
            break;
          case 'is_empty':
            qb.andWhere(
              `(c.custom_fields->>'${col}' IS NULL OR c.custom_fields->>'${col}' = '')`,
            );
            break;
          case 'is_not_empty':
            qb.andWhere(
              `(c.custom_fields->>'${col}' IS NOT NULL AND c.custom_fields->>'${col}' != '')`,
            );
            break;
        }
      });
    } catch {
      // ignore malformed JSON
    }
  }

  async findOne(business: Business, id: string): Promise<Contact> {
    const contact = await this.contactsRepo.findOne({
      where: { id, businessId: business.id },
      relations: ['tags', 'lifecycleStage', 'owner'],
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

    const { tags, ownerId, ...contactData } = dto;
    const contact = this.contactsRepo.create({
      ...contactData,
      businessId: business.id,
      ownerId: ownerId ?? currentUserId ?? null,
      tags: tags ? tags.map((id) => ({ id }) as Tag) : [],
      lastActivityAt: new Date(),
    });
    return this.contactsRepo.save(contact);
  }

  async update(
    business: Business,
    id: string,
    dto: UpdateContactDto,
  ): Promise<Contact> {
    const contact = await this.findOne(business, id);
    const previousLifecycleStageId = contact.lifecycleStageId;

    // Handle tags if present
    if (dto.tags) {
      contact.tags = dto.tags.map((id) => ({ id }) as Tag);
      delete dto.tags;
    }

    Object.assign(contact, dto);
    contact.lastActivityAt = new Date();
    const saved = await this.contactsRepo.save(contact);

    if (
      dto.lifecycleStageId &&
      dto.lifecycleStageId !== previousLifecycleStageId
    ) {
      await this.activitiesRepo.save(
        this.activitiesRepo.create({
          contact_id: saved.id,
          type: ActivityType.STAGE_CHANGE,
          content: `Lifecycle stage updated`,
          metadata: {
            from: previousLifecycleStageId,
            to: dto.lifecycleStageId,
          },
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
    await this.findOne(business, contactId);

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

    contact.lastActivityAt = new Date();
    await this.contactsRepo.save(contact);

    return activity;
  }

  async archive(business: Business, id: string): Promise<Contact> {
    const contact = await this.findOne(business, id);
    contact.isArchived = true;
    contact.lastActivityAt = new Date();
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
      contacts: [contact],
      title: dto.title,
      value: dto.value ?? 0,
      pipeline_id: dto.pipelineId,
      stage_id: dto.stageId,
      expected_close_date: dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : null,
      description: dto.description,
    });
    const savedDeal = await this.dealsRepo.save(deal);

    contact.lastActivityAt = new Date();
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

  private static readonly SOURCE_LABELS: Record<string, string> = {
    chatbot: 'Chatbot',
    email: 'Email',
    form: 'Formulario',
    import: 'Importación',
    instagram: 'Instagram',
    manual: 'Manual',
    whatsapp: 'WhatsApp',
  };

  private formatDate(value: Date | string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  private getColumnValue(contact: Contact, col: ExportColumnDto): string {
    const key = col.key;
    if (key.startsWith('cf_')) {
      const field = key.slice(3);
      const val = (contact.customFields as Record<string, unknown> | null)?.[
        field
      ];
      return val === null || val === undefined ? '' : String(val as any);
    }
    switch (key) {
      case 'tags':
        return (contact.tags ?? []).map((t) => t.name).join(', ');
      case 'lifecycleStage':
        return contact.lifecycleStage?.name ?? '';
      case 'ownerName':
        return contact.owner?.name ?? '';
      case 'company':
        return (contact.company as { name: string } | null)?.name ?? '';
      case 'source':
        return (
          ContactsService.SOURCE_LABELS[contact.source] ?? contact.source ?? ''
        );
      case 'createdAt':
        return this.formatDate(contact.createdAt);
      case 'lastActivityAt':
        return this.formatDate(contact.lastActivityAt);
      case 'updatedAt':
        return this.formatDate(contact.updatedAt);
      default:
        return String(
          ((contact as unknown as Record<string, unknown>)[key] ?? '') as any,
        );
    }
  }

  async exportCsv(business: Business, dto: ExportContactsDto): Promise<Buffer> {
    this.logger.log(
      `exportCsv: executing for business ID: ${business.id}. Parameters: ${JSON.stringify(dto)}`,
    );
    const qb = this.contactsRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.tags', 't')
      .leftJoinAndSelect('c.lifecycleStage', 'ls')
      .leftJoinAndSelect('c.owner', 'o')
      .leftJoinAndSelect('c.company', 'emp')
      .where('c.businessId = :bid', { bid: business.id });

    if (dto.lifecycleStageId)
      qb.andWhere('c.lifecycleStageId = :lifecycleStageId', {
        lifecycleStageId: dto.lifecycleStageId,
      });
    if (dto.source) qb.andWhere('c.source = :source', { source: dto.source });
    if (dto.ownerId === 'unassigned') {
      qb.andWhere('c.ownerId IS NULL');
    } else if (dto.ownerId) {
      qb.andWhere('c.ownerId = :ownerId', { ownerId: dto.ownerId });
    }
    if (dto.search) {
      qb.andWhere(
        new Brackets((q) => {
          q.where('c.name ILIKE :s', { s: `%${dto.search}%` })
            .orWhere('c.email ILIKE :s', { s: `%${dto.search}%` })
            .orWhere('c.phone ILIKE :s', { s: `%${dto.search}%` });
        }),
      );
    }
    if (dto.createdAtFrom)
      qb.andWhere('c.createdAt >= :createdAtFrom', {
        createdAtFrom: dto.createdAtFrom,
      });
    if (dto.createdAtTo)
      qb.andWhere('c.createdAt <= :createdAtTo', {
        createdAtTo: dto.createdAtTo,
      });
    if (dto.lastActivityAtFrom)
      qb.andWhere('c.lastActivityAt >= :lastActivityAtFrom', {
        lastActivityAtFrom: dto.lastActivityAtFrom,
      });
    if (dto.lastActivityAtTo)
      qb.andWhere('c.lastActivityAt <= :lastActivityAtTo', {
        lastActivityAtTo: dto.lastActivityAtTo,
      });
    if (dto.customFieldFilters) {
      try {
        const conditions = JSON.parse(dto.customFieldFilters) as Array<{
          field: string;
          operator: string;
          value: unknown;
        }>;
        conditions.forEach((cond, idx) => {
          const rawName = cond.field.replace('custom_fields.', '');
          const col = rawName.replace(/[^a-z0-9_]/gi, '');
          if (!col) return;
          const key = `cf_${idx}`;
          switch (cond.operator) {
            case 'equals':
              qb.andWhere(`c.custom_fields->>'${col}' = :${key}`, {
                [key]: String(cond.value),
              });
              break;
            case 'not_equals':
              qb.andWhere(`c.custom_fields->>'${col}' != :${key}`, {
                [key]: String(cond.value),
              });
              break;
            case 'contains':
              qb.andWhere(`c.custom_fields->>'${col}' ILIKE :${key}`, {
                [key]: `%${cond.value as string}%`,
              });
              break;
            case 'greater_than':
              qb.andWhere(`(c.custom_fields->>'${col}')::numeric > :${key}`, {
                [key]: Number(cond.value),
              });
              break;
            case 'less_than':
              qb.andWhere(`(c.custom_fields->>'${col}')::numeric < :${key}`, {
                [key]: Number(cond.value),
              });
              break;
            case 'is_empty':
              qb.andWhere(
                `(c.custom_fields->>'${col}' IS NULL OR c.custom_fields->>'${col}' = '')`,
              );
              break;
            case 'is_not_empty':
              qb.andWhere(
                `(c.custom_fields->>'${col}' IS NOT NULL AND c.custom_fields->>'${col}' != '')`,
              );
              break;
          }
        });
      } catch {
        /* ignore malformed JSON */
      }
    }

    qb.orderBy('c.updatedAt', 'DESC');
    this.logger.log('exportCsv: obtaining contacts from database...');
    const contacts = await qb.getMany();
    this.logger.log(
      `exportCsv: obtained ${contacts.length} contacts from database.`,
    );

    this.logger.log('exportCsv: writing/formatting contacts data to CSV...');
    const rows: string[][] = [
      dto.columns.map((c) => c.label),
      ...contacts.map((contact) =>
        dto.columns.map((col) => this.getColumnValue(contact, col)),
      ),
    ];

    const csvString = stringify(rows, { bom: true });
    this.logger.log(
      `exportCsv: CSV written successfully. Size: ${Buffer.byteLength(csvString)} bytes.`,
    );
    return Buffer.from(csvString, 'utf-8');
  }

  async import(
    business: Business,
    contacts: CreateContactDto[],
  ): Promise<{ count: number }> {
    await this.assertWithinPlanLimit(business, contacts.length);

    const entities = contacts.map((dto) =>
      this.contactsRepo.create({
        ...dto,
        businessId: business.id,
        tags: dto.tags ? dto.tags.map((id) => ({ id }) as Tag) : [],
        lastActivityAt: new Date(),
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
      where: { businessId: business.id },
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
