import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { Plan } from '@auth/entities/plan.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { UserStatus } from '@crm/enums/user-status.enum';
import { Team } from './team.entity';

@Entity({ name: 'users', schema: 'security' })
@Index('UQ_security_users_business_email', ['businessId', 'email'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class CrmUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ name: 'plan_id', type: 'uuid', nullable: true })
  planId: string;

  @ManyToOne(() => Plan, { nullable: true, eager: false })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'job_title', nullable: true })
  jobTitle: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column()
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.AGENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_account_activated', default: false })
  isAccountActivated: boolean;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date | null;

  @ManyToMany(() => Team, (team) => team.members)
  teams: Team[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @BeforeInsert()
  @BeforeUpdate()
  updateFullName() {
    const full = `${this.firstName || ''} ${this.lastName || ''}`.trim();
    if (full) {
      this.name = full;
    }
    // Keep isActive synchronized with status for backward compatibility
    this.isActive = this.status === UserStatus.ACTIVE;
  }
}
