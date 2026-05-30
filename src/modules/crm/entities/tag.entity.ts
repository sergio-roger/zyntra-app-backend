import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { Contact } from './contact.entity';

@Entity({ name: 'tags', schema: 'crm' })
@Index(['business_id'])
@Index('UQ_business_tag_name', ['business_id', 'name'], { unique: true, where: '"deleted_at" IS NULL' })
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

  @Column({ default: '#6366f1' }) // Default indigo color
  color: string;

  @Column('text', { nullable: true })
  description: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
 
  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
