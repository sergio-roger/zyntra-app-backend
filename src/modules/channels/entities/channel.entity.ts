import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { ChannelType } from '@/modules/channels/entities/channel-type.entity';
import { ChannelCredential } from '@/modules/channels/entities/channel-credential.entity';

export enum ChannelStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity({ name: 'channels', schema: 'public' })
@Unique('uq_channel_per_business_type_name', [
  'business_id',
  'channel_type_id',
  'name',
])
@Index('idx_channels_public_key', ['public_key'], {
  unique: true,
  where: 'public_key_revoked_at IS NULL',
})
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column('uuid')
  channel_type_id: string;

  @ManyToOne(() => ChannelType, (ct) => ct.channels, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'channel_type_id' })
  channelType: ChannelType;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ChannelStatus, default: ChannelStatus.ACTIVE })
  status: ChannelStatus;

  // Populated in Phase 3 when Agent entity exists; stored as plain UUID for now
  @Column('uuid', { nullable: true })
  agent_id: string | null;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  // Public, non-secret identifier embedded in the widget snippet; exchanged
  // for a short-lived session JWT. NULL for non-web_chat channels.
  @Column({ type: 'varchar', length: 32, nullable: true })
  public_key: string | null;

  // Domains allowed to perform the public_key -> JWT exchange. Empty = no
  // restriction (dev/testing only; the exchange endpoint logs a warning).
  @Column({ type: 'text', array: true, default: '{}' })
  allowed_origins: string[];

  // Set to revoke public_key without deleting the row (key rotation).
  @Column({ type: 'timestamptz', nullable: true })
  public_key_revoked_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => ChannelCredential, (cc) => cc.channel, {
    cascade: true,
    eager: false,
  })
  credentials: ChannelCredential;
}
