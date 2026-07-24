import { AgentCategory } from '@/modules/agents/entities/agent-category.entity';

export interface SystemAgentCatalogItem {
  id: string;
  slug: string;
  name: string;
  role: string;
  description: string;
  avatarUrl: string | null;
  personaPrompt: string;
  functions: string[];
  status: 'active' | 'coming_soon';
  model: string;
  category: AgentCategory | null;
  tasksDoneToday: number;
  tasksTotalToday: number;
  efficiency: number;
  createdAt: Date;
}
