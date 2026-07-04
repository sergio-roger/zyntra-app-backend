import { StorageClientService } from '@/storage-client/storage-client.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 0,
    }),
  ],
  providers: [StorageClientService],
  exports: [StorageClientService],
})
export class StorageClientModule {}
