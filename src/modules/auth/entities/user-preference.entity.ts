import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'user_preferences', schema: 'security' })
@Index(['user_id', 'key'], { unique: true })
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column('jsonb', { default: {} })
  value: any;

  @UpdateDateColumn()
  updated_at: Date;
}
