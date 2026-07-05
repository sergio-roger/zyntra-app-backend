import { Request } from 'express';
import { Business } from '@auth/entities/business.entity';
import { User } from '@auth/entities/user.entity';

export interface RequestWithUser extends Request {
  user: User & {
    business: Business;
    plan_id?: string;
    plan_status?: string;
  };
  session: {
    jwt?: string;
    [key: string]: unknown;
  } | null;
}
