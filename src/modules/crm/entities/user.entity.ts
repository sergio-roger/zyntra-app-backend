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
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { Plan } from '@auth/entities/plan.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { Team } from './team.entity';

@Entity({ name: 'users', schema: 'security' })
@Index('UQ_security_users_business_email', ['business_id', 'email'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class CrmUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid', nullable: true })
  plan_id: string;

  @ManyToOne(() => Plan, { nullable: true, eager: false })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  password_hash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.AGENT,
  })
  role: UserRole;

  @Column({ default: true })
  is_active: boolean;

  @ManyToMany(() => Team, (team) => team.members)
  teams: Team[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
