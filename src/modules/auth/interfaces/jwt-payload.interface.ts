import { UserRole } from '@crm/enums/user-role.enum';

export interface JwtPayload {
  sub: string; // user_id
  email: string;
  plan: string;
  plan_status: string;
  business_id: string;
  role: UserRole; // 'admin' | 'manager' | 'agent' | 'superAdmin'
}
