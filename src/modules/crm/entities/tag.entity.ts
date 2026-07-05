import { Business } from '@auth/entities/business.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tags', schema: 'crm' })
@Index(['business_id'])
@Index(['business_id', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  name: string;

  @Column({ default: '#6366f1' })
  color: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, default: 'contact' })
  entity_type: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
