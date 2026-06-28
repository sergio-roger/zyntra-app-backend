import { TaskStatus } from '@crm/enums/task-status.enum';
import { TaskPriority } from '@crm/enums/task-priority.enum';
import { Contact } from '@crm/entities/contact.entity';
import { Deal } from '@crm/entities/deal.entity';

export interface TaskResponse {
  assignedTo: string | null;
  contact: Contact | null;
  contactId: string | null;
  createdAt: Date;
  deal: Deal | null;
  dealId: string | null;
  description: string | null;
  dueDate: Date;
  id: string;
  priority: TaskPriority;
  status: TaskStatus;
  title: string;
  updatedAt: Date;
}
