import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmTask } from './entities/task.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '@crm/enums/task-status.enum';
import { ContactsService } from './contacts.service';
import { ActivityType } from './enums/activity-type.enum';

@Injectable()
export class CrmTasksService {
  constructor(
    @InjectRepository(CrmTask)
    private readonly tasksRepo: Repository<CrmTask>,
    private readonly contactsService: ContactsService,
  ) {}

  async list(business: Business, query: { status?: TaskStatus; contact_id?: string }) {
    const qb = this.tasksRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.contact', 'c')
      .where('t.business_id = :bid', { bid: business.id });

    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }

    if (query.contact_id) {
      qb.andWhere('t.contact_id = :cid', { cid: query.contact_id });
    }

    qb.orderBy('t.due_date', 'ASC');

    return qb.getMany();
  }

  async findOne(business: Business, id: string) {
    const task = await this.tasksRepo.findOne({
      where: { id, business_id: business.id },
      relations: ['contact'],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(business: Business, dto: CreateTaskDto) {
    const task = this.tasksRepo.create({
      ...dto,
      business_id: business.id,
      status: TaskStatus.PENDING,
    });
    return this.tasksRepo.save(task);
  }

  async update(business: Business, id: string, dto: UpdateTaskDto) {
    const task = await this.findOne(business, id);
    const oldStatus = task.status;

    Object.assign(task, dto);
    const saved = await this.tasksRepo.save(task);

    // If task is completed and has a contact, create an activity
    if (saved.status === TaskStatus.COMPLETED && oldStatus !== TaskStatus.COMPLETED && saved.contact_id) {
      await this.contactsService.addActivity(business, saved.contact_id, {
        type: ActivityType.NOTE, // Or a new TASK_COMPLETED type
        content: `Tarea completada: ${saved.title}`,
        metadata: { task_id: saved.id },
      });
    }

    return saved;
  }

  async remove(business: Business, id: string) {
    const task = await this.findOne(business, id);
    await this.tasksRepo.remove(task);
  }
}
