import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { CustomFieldType } from '@crm/enums/custom-field-type.enum';

@Entity({ name: 'custom_fields', schema: 'crm' })
@Index(['business_id'])
@Index('UQ_business_field_name', ['business_id', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class CustomField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ default: 'contact' })
  entity_type: string; // 'contact' | 'company'

  @Column()
  name: string; // internal key, e.g., 'preferred_contact_method'

  @Column()
  label: string; // display name, e.g., 'Método de contacto preferido'

  @Column({
    type: 'enum',
    enum: CustomFieldType,
    default: CustomFieldType.TEXT,
  })
  type: CustomFieldType;

  @Column('jsonb', { nullable: true })
  options: string[] | null; // For select type

  @Column({ default: false })
  required: boolean;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
