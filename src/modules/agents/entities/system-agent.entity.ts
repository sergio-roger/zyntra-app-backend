import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ default: 'gemini-flash-lite-latest' })
  model: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
