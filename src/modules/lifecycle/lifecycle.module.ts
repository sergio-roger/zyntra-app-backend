import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifecycleHistory } from '@/modules/lifecycle/entities/lifecycle-history.entity';
import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import { LifecycleController } from '@/modules/lifecycle/lifecycle.controller';
import { LifecycleService } from '@/modules/lifecycle/lifecycle.service';

@Module({
  imports: [TypeOrmModule.forFeature([LifecycleStage, LifecycleHistory])],
  providers: [LifecycleService],
  controllers: [LifecycleController],
  exports: [LifecycleService, TypeOrmModule],
})
export class LifecycleModule {}
