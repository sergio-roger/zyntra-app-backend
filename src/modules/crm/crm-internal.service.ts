import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { Contact } from '@crm/entities/contact.entity';
import { ContactSource } from '@crm/enums/contact-source.enum';
import { ContactsService } from '@crm/contacts.service';
import { CrmTasksService } from '@crm/crm-tasks.service';
import { InternalCreateLeadDto } from '@crm/dto/internal/internal-create-lead.dto';
import { InternalCreateTaskDto } from '@crm/dto/internal/internal-create-task.dto';
import { TaskResponse } from '@crm/interfaces/task-response.interface';

@Injectable()
export class CrmInternalService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    private readonly contactsService: ContactsService,
    private readonly crmTasksService: CrmTasksService,
  ) {}

  private async getBusinessOrThrow(businessId: string): Promise<Business> {
    const business = await this.businessRepo.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    return business;
  }

  async createLead(dto: InternalCreateLeadDto): Promise<Contact> {
    const business = await this.getBusinessOrThrow(dto.businessId);
    const { businessId, ...contactData } = dto;
    void businessId;

    return this.contactsService.create(
      business,
      { ...contactData, source: ContactSource.AGENT },
      null,
    );
  }

  async createTask(dto: InternalCreateTaskDto): Promise<TaskResponse> {
    const business = await this.getBusinessOrThrow(dto.businessId);
    const { businessId, agentId, ...taskData } = dto;
    void businessId;

    return this.crmTasksService.createFromAgent(business, taskData, agentId);
  }
}
