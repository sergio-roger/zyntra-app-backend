import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { LifecycleHistory } from '@/modules/lifecycle/entities/lifecycle-history.entity';
import {
  LifecycleStage,
  LifecycleStageType,
} from '@/modules/lifecycle/entities/lifecycle-stage.entity';

@Injectable()
export class LifecycleService {
  constructor(
    @InjectRepository(LifecycleStage)
    private readonly stageRepository: Repository<LifecycleStage>,
    @InjectRepository(LifecycleHistory)
    private readonly historyRepository: Repository<LifecycleHistory>,
  ) {}

  async logStageChange(
    contactId: string,
    newStageId: string,
    oldStageId?: string,
    changedById?: string,
    reason?: string,
  ): Promise<LifecycleHistory> {
    const history = this.historyRepository.create({
      contact_id: contactId,
      new_stage_id: newStageId,
      old_stage_id: oldStageId || null,
      changed_by_id: changedById || null,
      change_reason: reason || null,
    });
    return this.historyRepository.save(history);
  }

  async findAll(businessId: string): Promise<LifecycleStage[]> {
    const stages = await this.stageRepository.find({
      where: { business_id: businessId },
      order: { position: 'ASC' },
    });

    if (stages.length === 0) {
      return this.seedDefaultStages(businessId);
    }

    return stages;
  }

  async seedDefaultStages(businessId: string): Promise<LifecycleStage[]> {
    const defaultStages = [
      {
        name: 'New Lead',
        description: 'Contacto recién ingresado al sistema.',
        icon: '🆕',
        position: 0,
        type: LifecycleStageType.ACTIVE,
        is_default: true,
        is_won: false,
        is_system: true,
      },
      {
        name: 'Hot Lead',
        description: 'Contacto con alto interés demostrado.',
        icon: '🔥',
        position: 1,
        type: LifecycleStageType.ACTIVE,
        is_default: false,
        is_won: false,
        is_system: true,
      },
      {
        name: 'Payment',
        description: 'En proceso de pago o facturación.',
        icon: '💵',
        position: 2,
        type: LifecycleStageType.ACTIVE,
        is_default: false,
        is_won: false,
        is_system: true,
      },
      {
        name: 'Customer',
        description: 'Venta cerrada con éxito.',
        icon: '🏆',
        position: 3,
        type: LifecycleStageType.ACTIVE,
        is_default: false,
        is_won: true,
        is_system: true,
      },
      {
        name: 'Cold Lead',
        description: 'Contacto sin interés o perdido.',
        icon: '❄️',
        position: 4,
        type: LifecycleStageType.LOST,
        is_default: false,
        is_won: false,
        is_system: true,
      },
    ];

    const entities = defaultStages.map((s) =>
      this.stageRepository.create({ ...s, business_id: businessId }),
    );

    return this.stageRepository.save(entities);
  }

  async updateStages(
    businessId: string,
    stages: Partial<LifecycleStage>[],
  ): Promise<LifecycleStage[]> {
    // 1. Identify which stages to keep/update
    const stageIdsToKeep = stages
      .filter((s) => s.id)
      .map((s) => s.id as string);

    // 2. Delete stages that are NOT in the incoming array and NOT system-managed
    // This ensures the DB reflects the user's deletions in the UI
    const existingStages = await this.stageRepository.find({
      where: { business_id: businessId },
    });
    const stagesToDelete = existingStages.filter(
      (s) => !s.is_system && !stageIdsToKeep.includes(s.id),
    );

    if (stagesToDelete.length > 0) {
      await this.stageRepository.remove(stagesToDelete);
    }

    // 3. Prepare entities for save (TypeORM .save() handles both insert and update)
    const entitiesToSave: LifecycleStage[] = stages.map((s, index) => {
      const stage = this.stageRepository.create(
        s as DeepPartial<LifecycleStage>,
      );
      stage.business_id = businessId;
      stage.position = index;
      return stage;
    });

    return this.stageRepository.save(entitiesToSave);
  }
}
