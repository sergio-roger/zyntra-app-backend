import { UserRole } from '@crm/enums/user-role.enum';
import { Plan } from '@auth/entities/plan.entity';

export interface SelfProfileTeam {
  id: string;
  name: string;
  color: string;
}

export interface SelfProfile {
  id: string;
  businessId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: UserRole;
  plan: Plan | null;
  plan_status: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  phone: string | null;
  bio: string | null;
  isAccountActivated: boolean;
  status: string;
  activatedAt: Date | null;
  teams: SelfProfileTeam[];
  createdAt: Date;
}
