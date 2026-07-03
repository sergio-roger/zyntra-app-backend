import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Channel } from './channel.entity';

@Entity({ name: 'channel_credentials', schema: 'public' })
export class ChannelCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  channel_id: string;

  @OneToOne(() => Channel, (c) => c.credentials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  // AES-256-GCM encrypted JSON: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
  @Column('text')
  data: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
