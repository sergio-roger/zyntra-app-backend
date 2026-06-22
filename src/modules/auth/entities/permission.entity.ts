import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { Menu } from './menu.entity';

@Entity({ name: 'permissions', schema: 'security' })
@Index(['business_id', 'role_id', 'menu_id'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // NULL = global template; set to a business UUID for per-business permissions
  @Column({ type: 'uuid', nullable: true, default: null })
  business_id: string | null;

  @Column('uuid')
  role_id: string;

  @Column('uuid')
  menu_id: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Menu, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
