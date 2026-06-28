import { Business } from '@auth/entities/business.entity';
import { TaskPriority } from '@crm/enums/task-priority.enum';
import { TaskStatus } from '@crm/enums/task-status.enum';
import { UserRole } from '@crm/enums/user-role.enum';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactsService } from '@crm/contacts.service';
import { CreateTaskDto } from '@crm/dto/create-task.dto';
import { UpdateTaskDto } from '@crm/dto/update-task.dto';
import { CrmTask } from '@crm/entities/task.entity';
import { ActivityType } from '@crm/enums/activity-type.enum';
import { CallerContext } from '@crm/interfaces/caller-context.interface';

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date;
  status: TaskStatus;
  priority: TaskPriority;
  contactId: string | null;
  dealId: string | null;
  assignedTo: string | null;
  contact: any;
  deal: any;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CrmTasksService {
  constructor(
    @InjectRepository(CrmTask)
    private readonly tasksRepo: Repository<CrmTask>,
    private readonly contactsService: ContactsService,
  ) {}

  async list(
    business: Business,
    query: { status?: TaskStatus; contactId?: string; dealId?: string },
    caller?: CallerContext,
  ): Promise<TaskResponse[]> {
    const qb = this.tasksRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.contact', 'c')
      .where('t.business_id = :bid', { bid: business.id });

    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }

    if (query.contactId) {
      qb.andWhere('t.contact_id = :cid', { cid: query.contactId });
    }

    if (query.dealId) {
      qb.andWhere('t.deal_id = :did', { did: query.dealId });
    }

    // Agent sees only tasks assigned to them
    if (caller?.role === UserRole.AGENT && caller?.id) {
      qb.andWhere('t.assigned_to = :uid', { uid: caller.id });
    }

    qb.orderBy('t.due_date', 'ASC');

    const tasks = await qb.getMany();
    return tasks.map(t => this.mapTask(t));
  }

  async findOne(business: Business, id: string): Promise<TaskResponse> {
    const task = await this.tasksRepo.findOne({
      where: { id, business_id: business.id },
      relations: ['contact'],
    });
    if (!task) throw new NotFoundException('Task not found');
    return this.mapTask(task);
  }

  async create(business: Business, dto: CreateTaskDto): Promise<TaskResponse> {
    const task = this.tasksRepo.create({
      title: dto.title,
      description: dto.description,
      due_date: dto.dueDate ? new Date(dto.dueDate) : undefined,
      priority: dto.priority,
      contact_id: dto.contactId,
      deal_id: dto.dealId,
      assigned_to: dto.assignedTo,
      business_id: business.id,
      status: TaskStatus.PENDING,
    });
    const saved = await this.tasksRepo.save(task);
    return this.mapTask(saved);
  }

  async update(
    business: Business,
    id: string,
    dto: UpdateTaskDto,
    caller?: CallerContext,
  ): Promise<TaskResponse> {
    const existing = await this.tasksRepo.findOne({
      where: { id, business_id: business.id },
      relations: ['contact'],
    });
    if (!existing) throw new NotFoundException('Task not found');

    if (caller?.role === UserRole.AGENT && existing.assigned_to !== caller.id) {
      throw new ForbiddenException('Solo puedes editar tareas asignadas a ti');
    }

    const oldStatus = existing.status;

    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.dueDate !== undefined) existing.due_date = new Date(dto.dueDate);
    if (dto.priority !== undefined) existing.priority = dto.priority;
    if (dto.contactId !== undefined) existing.contact_id = dto.contactId;
    if (dto.dealId !== undefined) existing.deal_id = dto.dealId;
    if (dto.assignedTo !== undefined) existing.assigned_to = dto.assignedTo;
    if (dto.status !== undefined) existing.status = dto.status;

    const saved = await this.tasksRepo.save(existing);

    if (
      saved.status === TaskStatus.COMPLETED &&
      oldStatus !== TaskStatus.COMPLETED &&
      saved.contact_id
    ) {
      await this.contactsService.addActivity(business, saved.contact_id, {
        type: ActivityType.NOTE,
        content: `Tarea completada: ${saved.title}`,
        metadata: { task_id: saved.id },
      });
    }

    return this.mapTask(saved);
  }

  async remove(business: Business, id: string) {
    const existing = await this.tasksRepo.findOne({
      where: { id, business_id: business.id },
    });
    if (!existing) throw new NotFoundException('Task not found');
    await this.tasksRepo.softRemove(existing);
  }

  private mapTask(task: CrmTask): TaskResponse {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      status: task.status,
      priority: task.priority,
      contactId: task.contact_id,
      dealId: task.deal_id,
      assignedTo: task.assigned_to,
      contact: task.contact,
      deal: task.deal,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    };
  }
}
