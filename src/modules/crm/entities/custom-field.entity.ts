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
@Index(['businessId'])
@Index('UQ_business_field_name', ['businessId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class CustomField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ name: 'entity_type', default: 'contact' })
  entityType: string; // 'contact' | 'company'

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

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
