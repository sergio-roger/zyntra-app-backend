import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Channel } from '@/modules/channels/entities/channel.entity';

@Entity({ name: 'channel_credentials', schema: 'settings' })
export class ChannelCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'channel_id', type: 'uuid', unique: true })
  channelId: string;

  @OneToOne(() => Channel, (c) => c.credentials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  // AES-256-GCM encrypted JSON: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
  @Column('text')
  data: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
