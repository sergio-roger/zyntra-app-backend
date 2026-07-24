import { Business } from '@auth/entities/business.entity';
import { User } from '@auth/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageClientModule } from '@/storage-client/storage-client.module';
import { DriveController } from '@/modules/drive/drive.controller';
import { DriveService } from '@/modules/drive/drive.service';

@Module({
  imports: [TypeOrmModule.forFeature([Business, User]), StorageClientModule],
  controllers: [DriveController],
  providers: [DriveService],
  exports: [DriveService],
})
export class DriveModule {}
