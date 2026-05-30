import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { CrmUser } from './user.entity';

@Entity({ name: 'teams', schema: 'security' })
@Index(['business_id'])
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ default: '#4F46E5' })
  color: string;

  @ManyToMany(() => CrmUser, (user) => user.teams, { cascade: true })
  @JoinTable({
    name: 'team_members',
    schema: 'security',
    joinColumn: { name: 'team_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: CrmUser[];

  @DeleteDateColumn()
  deleted_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
