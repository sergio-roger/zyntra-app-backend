import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Channel } from '@/modules/channels/entities/channel.entity';

@Entity({ name: 'channel_types', schema: 'public' })
export class ChannelType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  label: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ nullable: true, type: 'varchar' })
  icon_url: string | null;

  @Column({ default: false })
  is_available: boolean;

  @Column({ type: 'jsonb', default: {} })
  config_schema: Record<string, unknown>;

  @Column({ default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Channel, (c) => c.channelType)
  channels: Channel[];
}
