import { HttpModule } from '@nestjs/axios';

export const httpModuleConfig = HttpModule.register({
  timeout: 30000,
  maxRedirects: 5,
});
