import { SystemAgentCatalogItem } from '@/modules/agents/interfaces/system-agent-catalog-item.interface';

export interface ImportedSystemAgentResponse {
  importedAt: Date;
  systemAgent: SystemAgentCatalogItem;
}
