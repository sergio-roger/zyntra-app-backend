import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'roles', schema: 'security' })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  label: string;

  @Column({ name: 'is_editable', type: 'boolean', default: true })
  isEditable: boolean;

  @Column({ name: 'business_id', type: 'uuid', nullable: true })
  businessId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  badge: string;

  @Column({ name: 'badge_color', type: 'varchar', length: 100, nullable: true })
  badgeColor: string;

  @Column({ name: 'icon_color', type: 'varchar', length: 100, nullable: true })
  iconColor: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
