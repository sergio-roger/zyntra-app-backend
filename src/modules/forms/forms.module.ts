import { Business } from '@auth/entities/business.entity';
import { CrmModule } from '@crm/crm.module';
import { Company } from '@crm/entities/company.entity';
import { Contact } from '@crm/entities/contact.entity';
import { CustomField } from '@crm/entities/custom-field.entity';
import { FormField } from '@/modules/forms/entities/form-field.entity';
import { FormSubmission } from '@/modules/forms/entities/form-submission.entity';
import { FormTemplate } from '@/modules/forms/entities/form-template.entity';
import { FormsPublicController } from '@/modules/forms/forms-public.controller';
import { FormSubmissionsService } from '@/modules/forms/form-submissions.service';
import { FormTemplatesController } from '@/modules/forms/form-templates.controller';
import { FormTemplatesService } from '@/modules/forms/form-templates.service';
import { FormRateLimitGuard } from '@/modules/forms/guards/form-rate-limit.guard';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormTemplate,
      FormField,
      FormSubmission,
      Business,
      Contact,
      Company,
      CustomField,
    ]),
    CrmModule,
  ],
  controllers: [FormTemplatesController, FormsPublicController],
  providers: [
    FormTemplatesService,
    FormSubmissionsService,
    FormRateLimitGuard,
  ],
  exports: [FormTemplatesService, FormSubmissionsService],
})
export class FormsModule {}
