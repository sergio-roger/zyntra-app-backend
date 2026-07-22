import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { SystemAgent } from '@/modules/agents/entities/system-agent.entity';

@Entity({ name: 'business_system_agents', schema: 'marketing' })
export class BusinessSystemAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ name: 'system_agent_id', type: 'uuid' })
  systemAgentId: string;

  @ManyToOne(() => SystemAgent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'system_agent_id' })
  systemAgent: SystemAgent;

  @CreateDateColumn({ name: 'imported_at' })
  importedAt: Date;
}
