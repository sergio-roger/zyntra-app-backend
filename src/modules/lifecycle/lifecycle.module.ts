import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifecycleStage } from './entities/lifecycle-stage.entity';
import { LifecycleHistory } from './entities/lifecycle-history.entity';
import { LifecycleService } from './lifecycle.service';
import { LifecycleController } from './lifecycle.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LifecycleStage, LifecycleHistory])],
  providers: [LifecycleService],
  controllers: [LifecycleController],
  exports: [LifecycleService, TypeOrmModule],
})
export class LifecycleModule {}
