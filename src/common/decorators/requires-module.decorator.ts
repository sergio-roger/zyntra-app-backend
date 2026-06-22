import { SetMetadata } from '@nestjs/common';

export const REQUIRES_MODULE_KEY = 'requires_module';
export const RequiresModule = (menuKey: string) =>
  SetMetadata(REQUIRES_MODULE_KEY, menuKey);
