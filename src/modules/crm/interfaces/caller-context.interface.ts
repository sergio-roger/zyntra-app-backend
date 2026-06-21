import { UserRole } from '@crm/enums/user-role.enum';

export interface CallerContext {
  id: string | null;
  role: UserRole;
}
