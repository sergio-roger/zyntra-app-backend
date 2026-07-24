import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AgentCategory } from '@/modules/agents/entities/agent-category.entity';
import { AgentTool } from '@/modules/agents/enums/agent-tool.enum';

// Separada de Agent (User Agents, business_id NOT NULL) — un System Agent
// es global, no pertenece a ningún negocio. Ver
// 20260721_create_system_agents.sql.
@Entity({ name: 'system_agents', schema: 'workflows' })
export class SystemAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column()
  role: string;

  @Column({ default: '' })
  description: string;

  @Column({ name: 'avatar_object_key', type: 'varchar', nullable: true })
  avatarObjectKey: string | null;

  // Mini-prompt de personalidad para mostrar en el catálogo/modal —
  // no se usa como instrucción real del runtime (eso sigue fijo en
  // marketing-agents).
  @Column({ name: 'persona_prompt', default: '' })
  personaPrompt: string;

  // Lista descriptiva de tareas que el agente realiza, solo para UI —
  // independiente de `tools` (enum funcional del runtime).
  @Column('simple-array', { default: '' })
  functions: string[];

  @Column({ default: 'coming_soon' })
  status: 'active' | 'coming_soon';

  @Column({ default: 'gemini-flash-lite-latest' })
  model: string;

  // Catálogo global, fijado por rol — no editable por el negocio (a
  // diferencia de Agent.tools). Ver 20260723_add_tools_to_system_agents.sql.
  @Column('simple-array', { default: '' })
  tools: AgentTool[];

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => AgentCategory)
  @JoinColumn({ name: 'category_id' })
  category: AgentCategory | null;

  // Sin lógica de cálculo todavía — quedan en 0 hasta implementarse
  // tracking real (ver 20260721_add_category_and_stats_to_system_agents.sql).
  @Column({ name: 'tasks_done_today', default: 0 })
  tasksDoneToday: number;

  @Column({ name: 'tasks_total_today', default: 0 })
  tasksTotalToday: number;

  @Column({ default: 0 })
  efficiency: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
