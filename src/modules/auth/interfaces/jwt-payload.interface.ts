import { UserRole } from '@crm/enums/user-role.enum';

export interface JwtPayload {
  sub: string; // business_id
  email: string;
  plan: string;
  plan_status: string;
  business_id: string;
  crm_user_id?: string; // UUID del CrmUser autenticado (ausente en login de Business)
  role?: UserRole; // 'admin' | 'manager' | 'agent'
}
