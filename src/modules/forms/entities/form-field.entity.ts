import { CustomFieldType } from '@crm/enums/custom-field-type.enum';
import { FormFieldValidation } from '@/modules/forms/interfaces/form-field-validation.interface';
import { FormTemplate } from '@/modules/forms/entities/form-template.entity';
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

@Entity({ name: 'form_fields', schema: 'workflows' })
@Index(['formTemplateId'])
@Index('UQ_form_template_field_key', ['formTemplateId', 'fieldKey'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class FormField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_template_id', type: 'uuid' })
  formTemplateId: string;

  @ManyToOne(() => FormTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_template_id' })
  formTemplate: FormTemplate;

  @Column({ name: 'field_key' })
  fieldKey: string;

  @Column()
  label: string;

  @Column({
    type: 'enum',
    enum: CustomFieldType,
    default: CustomFieldType.TEXT,
  })
  type: CustomFieldType;

  @Column('jsonb', { nullable: true })
  options: string[] | null;

  @Column({ default: false })
  required: boolean;

  @Column({ type: 'int' })
  position: number;

  // Convención de namespace: 'contact.email' | 'contact.name' | 'contact.phone' |
  // 'contact.jobTitle' | 'contact.custom.<name>' | 'company.name' |
  // 'company.website' | 'company.custom.<name>' | 'deal.value' | null.
  @Column({ name: 'maps_to', type: 'varchar', nullable: true })
  mapsTo: string | null;

  @Column({ type: 'varchar', nullable: true })
  placeholder: string | null;

  @Column({ type: 'jsonb', nullable: true })
  validation: FormFieldValidation | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
