import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  AgentTask,
  AgentTaskDocument,
  AgentTaskStatus,
} from './schemas/agent-task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { Business } from '../auth/entities/business.entity';
import { ChatbotConfig } from '../chatbot/entities/chatbot-config.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(AgentTask.name)
    private taskModel: Model<AgentTaskDocument>,
    @InjectRepository(Business)
    private businessRepo: Repository<Business>,
    @InjectRepository(ChatbotConfig)
    private chatbotConfigRepo: Repository<ChatbotConfig>,
    @InjectQueue('agent-tasks')
    private tasksQueue: Queue,
  ) { }

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
    const limit = business.plan_object?.task_limit;
    
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

      const tasksThisMonth = await this.taskModel.countDocuments({
        business_id: businessId,
        createdAt: { $gte: startOfMonth },
      });

      if (tasksThisMonth >= limit) {
        throw new ForbiddenException(
          `Has alcanzado el límite de ${limit} tareas mensuales de tu plan ${business.plan_object?.name}.`,
        );
      }
    }

    // 3. Cargar configuración del chatbot para el contexto
    const chatbotConfig = await this.chatbotConfigRepo.findOne({
      where: { business_id: businessId },
    });

    // 3.1. Crear la tarea en MongoDB
    const task = await this.taskModel.create({
      business_id: businessId,
      type: dto.type,
      status: AgentTaskStatus.PENDING,
      input: dto.input,
    });
    console.log('DEBUG: Tarea creada en MongoDB con ID:', task._id);

    // 4. Construir el BusinessContext para el worker Python
    const businessContext = {
      business_id: business.id,
      name: business.name,
      plan: business.plan_object?.name || 'Standard',
      industry: (chatbotConfig as any)?.industry || 'N/A',
      tone: chatbotConfig?.tone || 'friendly',
      locale: chatbotConfig?.locale || 'es',
      target_audience: (chatbotConfig as any)?.target_audience || 'N/A',
      active_channels: chatbotConfig?.active_channels || ['web'],
      system_prompt_extra: chatbotConfig?.system_prompt_extra || '',
      faqs_top: (chatbotConfig?.faqs || []).slice(0, 5),
    };

    // 5. Encolar en BullMQ (Redis)
    await this.tasksQueue.add(
      'execute-crew',
      {
        task_id: task._id.toString(),
        task_type: task.type,
        task_input: task.input,
        business_context: businessContext,
      },
      {
        jobId: task._id.toString(),
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    return task;
  }

  async findAll(businessId: string): Promise<AgentTask[]> {
    return this.taskModel
      .find({ business_id: businessId })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async findOne(id: string, businessId: string): Promise<AgentTask> {
    const task = await this.taskModel.findOne({
      _id: id,
      business_id: businessId,
    });
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }
    return task;
  }
}
