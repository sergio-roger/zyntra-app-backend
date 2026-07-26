import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AgentTask } from './entities/agent-task.entity';
import { AgentTaskStatus } from './enums/agent-task-status.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { Business } from '../auth/entities/business.entity';
import { AGENT_TASKS_QUEUE } from '@/modules/tasks/constants/tasks.constants';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(AgentTask)
    private taskRepo: Repository<AgentTask>,
    @InjectRepository(Business)
    private businessRepo: Repository<Business>,
    @InjectQueue(AGENT_TASKS_QUEUE)
    private tasksQueue: Queue,
  ) {}

  async create(businessId: string, dto: CreateTaskDto): Promise<AgentTask> {
    // 1. Verificar que el negocio existe y su plan
    const business = await this.businessRepo.findOne({
      where: { id: businessId },
      relations: ['plan_object'],
    });
    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    // 2. Validar límites según el plan dinámico
    const limit = business.plan_object?.taskLimit;

    // Si el límite es 0, no incluye agentes
    if (limit === 0) {
      throw new ForbiddenException(
        `Tu plan "${business.plan_object?.name}" no incluye agentes de IA. Por favor, actualiza tu suscripción.`,
      );
    }

    // Si no es ilimitado (999999), verificamos el consumo del mes
    if (limit && limit !== 999999) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const tasksThisMonth = await this.taskRepo.count({
        where: { businessId, createdAt: MoreThanOrEqual(startOfMonth) },
      });

      if (tasksThisMonth >= limit) {
        throw new ForbiddenException(
          `Has alcanzado el límite de ${limit} tareas mensuales de tu plan ${business.plan_object?.name}.`,
        );
      }
    }

    // 3. Crear la tarea
    const task = await this.taskRepo.save(
      this.taskRepo.create({
        businessId,
        type: dto.type,
        status: AgentTaskStatus.PENDING,
        input: dto.input as unknown,
      }),
    );
    this.logger.debug(
      `Tarea creada: id=${task.id} business_id=${businessId} type=${dto.type}`,
    );

    // 4. Construir el BusinessContext para el worker Mastra (marketing-agents)
    const businessContext = {
      business_id: business.id,
      name: business.name,
      plan: business.plan_object?.name || 'Standard',
      industry: 'N/A',
      tone: 'friendly',
      locale: 'es',
      target_audience: 'N/A',
      active_channels: ['web'],
      system_prompt_extra: '',
      faqs_top: [],
    };

    // 5. Encolar en BullMQ (Redis)
    await this.tasksQueue.add(
      'execute-agent-task',
      {
        task_id: task.id,
        task_type: task.type,
        task_input: task.input as unknown,
        business_context: businessContext,
      },

      {
        jobId: task.id,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    return task;
  }

  async findAll(businessId: string): Promise<AgentTask[]> {
    return this.taskRepo.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async findOne(id: string, businessId: string): Promise<AgentTask> {
    const task = await this.taskRepo.findOne({
      where: { id, businessId },
    });
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }
    return task;
  }
}
