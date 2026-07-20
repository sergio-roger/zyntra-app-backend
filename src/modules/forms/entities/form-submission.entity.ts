import { Business } from '@auth/entities/business.entity';
import { Company } from '@crm/entities/company.entity';
import { Contact } from '@crm/entities/contact.entity';
import { FormTemplate } from '@/modules/forms/entities/form-template.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'form_submissions', schema: 'workflows' })
@Index(['businessId'])
@Index(['formTemplateId'])
export class FormSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_template_id', type: 'uuid' })
  formTemplateId: string;

  @ManyToOne(() => FormTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_template_id' })
  formTemplate: FormTemplate;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column('jsonb')
  data: Record<string, unknown>;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @ManyToOne(() => Contact, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @Column({ name: 'source_channel', type: 'varchar', nullable: true })
  sourceChannel: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
