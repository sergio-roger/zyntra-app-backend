import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { LifecycleHistory } from '@/modules/lifecycle/entities/lifecycle-history.entity';
import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import { LifecycleStageType } from '@/modules/lifecycle/enums/lifecycle-stage-type.enum';

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
      contactId: contactId,
      newStageId: newStageId,
      oldStageId: oldStageId || null,
      changedById: changedById || null,
      changeReason: reason || null,
    });
    return this.historyRepository.save(history);
  }

  async findAll(businessId: string): Promise<LifecycleStage[]> {
    const stages = await this.stageRepository.find({
      where: { businessId },
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
        isDefault: true,
        isWon: false,
        isSystem: true,
      },
      {
        name: 'Hot Lead',
        description: 'Contacto con alto interés demostrado.',
        icon: '🔥',
        position: 1,
        type: LifecycleStageType.ACTIVE,
        isDefault: false,
        isWon: false,
        isSystem: true,
      },
      {
        name: 'Payment',
        description: 'En proceso de pago o facturación.',
        icon: '💵',
        position: 2,
        type: LifecycleStageType.ACTIVE,
        isDefault: false,
        isWon: false,
        isSystem: true,
      },
      {
        name: 'Customer',
        description: 'Venta cerrada con éxito.',
        icon: '🏆',
        position: 3,
        type: LifecycleStageType.ACTIVE,
        isDefault: false,
        isWon: true,
        isSystem: true,
      },
      {
        name: 'Cold Lead',
        description: 'Contacto sin interés o perdido.',
        icon: '❄️',
        position: 4,
        type: LifecycleStageType.LOST,
        isDefault: false,
        isWon: false,
        isSystem: true,
      },
    ];

    const entities = defaultStages.map((s) =>
      this.stageRepository.create({ ...s, businessId }),
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
      where: { businessId },
    });
    const stagesToDelete = existingStages.filter(
      (s) => !s.isSystem && !stageIdsToKeep.includes(s.id),
    );

    if (stagesToDelete.length > 0) {
      await this.stageRepository.remove(stagesToDelete);
    }

    // 3. Prepare entities for save (TypeORM .save() handles both insert and update)
    const entitiesToSave: LifecycleStage[] = stages.map((s, index) => {
      const stage = this.stageRepository.create(
        s as DeepPartial<LifecycleStage>,
      );
      stage.businessId = businessId;
      stage.position = index;
      return stage;
    });

    return this.stageRepository.save(entitiesToSave);
  }
}
