import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
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
@Index('idx_channels_public_key', ['publicKey'], {
  unique: true,
  where: 'public_key_revoked_at IS NULL',
})
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ name: 'channel_type_id', type: 'uuid' })
  channelTypeId: string;

  @ManyToOne(() => ChannelType, (ct) => ct.channels, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'channel_type_id' })
  channelType: ChannelType;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ChannelStatus, default: ChannelStatus.ACTIVE })
  status: ChannelStatus;

  // Populated in Phase 3 when Agent entity exists; stored as plain UUID for now
  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId: string | null;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  // Public, non-secret identifier embedded in the widget snippet; exchanged
  // for a short-lived session JWT. NULL for non-web_chat channels.
  @Column({
    name: 'public_key',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  publicKey: string | null;

  // Domains allowed to perform the public_key -> JWT exchange. Empty = no
  // restriction (dev/testing only; the exchange endpoint logs a warning).
  @Column({
    name: 'allowed_origins',
    type: 'text',
    array: true,
    default: '{}',
  })
  allowedOrigins: string[];

  // Domains explicitly denied, checked before allowed_origins. Ignored when
  // allow_insecure_origins is true.
  @Column({
    name: 'blocked_origins',
    type: 'text',
    array: true,
    default: '{}',
  })
  blockedOrigins: string[];

  // Escape hatch: bypasses allowed_origins/blocked_origins entirely and
  // permits the exchange from any origin.
  @Column({ name: 'allow_insecure_origins', type: 'boolean', default: false })
  allowInsecureOrigins: boolean;

  // Set to revoke public_key without deleting the row (key rotation).
  @Column({
    name: 'public_key_revoked_at',
    type: 'timestamptz',
    nullable: true,
  })
  publicKeyRevokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @OneToOne(() => ChannelCredential, (cc) => cc.channel, {
    cascade: true,
    eager: false,
  })
  credentials: ChannelCredential;
}
