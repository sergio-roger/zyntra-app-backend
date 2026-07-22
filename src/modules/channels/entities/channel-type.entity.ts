import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Channel } from '@/modules/channels/entities/channel.entity';

@Entity({ name: 'channel_types', schema: 'settings' })
export class ChannelType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  label: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ name: 'icon_url', nullable: true, type: 'varchar' })
  iconUrl: string | null;

  @Column({ name: 'is_available', default: false })
  isAvailable: boolean;

  @Column({ name: 'config_schema', type: 'jsonb', default: {} })
  configSchema: Record<string, unknown>;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Channel, (c) => c.channelType)
  channels: Channel[];
}
