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
import { Role } from '@auth/entities/role.entity';
import { Menu } from '@auth/entities/menu.entity';

@Entity({ name: 'permissions', schema: 'security' })
@Index(['businessId', 'roleId', 'menuId'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // NULL = global template; set to a business UUID for per-business permissions
  @Column({ name: 'business_id', type: 'uuid', nullable: true, default: null })
  businessId: string | null;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({ name: 'menu_id', type: 'uuid' })
  menuId: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Menu, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
