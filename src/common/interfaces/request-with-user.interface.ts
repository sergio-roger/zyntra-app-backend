import { Request } from 'express';
import { Business } from '@auth/entities/business.entity';

export interface RequestWithUser extends Request {
  user: Business & {
    business_id?: string;
    email?: string;
    plan?: string;
    plan_status?: string;
  };
  session: {
    jwt?: string;
    [key: string]: unknown;
  } | null;
}
