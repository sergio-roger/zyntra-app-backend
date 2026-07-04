import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@auth/entities/user.entity';

@Entity({ name: 'user_preferences', schema: 'security' })
@Index(['user_id', 'key'], { unique: true })
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column('jsonb', { default: {} })
  value: unknown;

  @UpdateDateColumn()
  updated_at: Date;
}
