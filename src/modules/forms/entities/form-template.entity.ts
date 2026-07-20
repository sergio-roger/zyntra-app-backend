import { Business } from '@auth/entities/business.entity';
import { FormStatus } from '@/modules/forms/enums/form-status.enum';
import { FormSubmitAction } from '@/modules/forms/enums/form-submit-action.enum';
import { FormTargetEntityType } from '@/modules/forms/enums/form-target-entity-type.enum';
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

@Entity({ name: 'form_templates', schema: 'workflows' })
@Index(['businessId'])
@Index('UQ_business_form_slug', ['businessId', 'slug'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class FormTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: FormStatus, default: FormStatus.DRAFT })
  status: FormStatus;

  @Column({
    name: 'submit_action',
    type: 'enum',
    enum: FormSubmitAction,
    default: FormSubmitAction.CREATE_CONTACT,
  })
  submitAction: FormSubmitAction;

  @Column({
    name: 'target_entity_type',
    type: 'enum',
    enum: FormTargetEntityType,
    nullable: true,
  })
  targetEntityType: FormTargetEntityType | null;

  @Column({ name: 'success_message', type: 'text', nullable: true })
  successMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
