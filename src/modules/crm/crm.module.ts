import { AuthModule } from '@auth/auth.module';
import { Plan } from '@auth/entities/plan.entity';
import { CompaniesController } from '@crm/companies.controller';
import { CompaniesService } from '@crm/companies.service';
import { ContactsController } from '@crm/contacts.controller';
import { ContactsService } from '@crm/contacts.service';
import { CrmTasksController } from '@crm/crm-tasks.controller';
import { CrmTasksService } from '@crm/crm-tasks.service';
import { CrmUsersController } from '@crm/crm-users.controller';
import { CrmUsersService } from '@crm/crm-users.service';
import { CustomFieldsController } from '@crm/custom-fields.controller';
import { CustomFieldsService } from '@crm/custom-fields.service';
import { DealsController } from '@crm/deals.controller';
import { DealsService } from '@crm/deals.service';
import { Company } from '@crm/entities/company.entity';
import { ContactActivity } from '@crm/entities/contact-activity.entity';
import { Contact } from '@crm/entities/contact.entity';
import { CustomField } from '@crm/entities/custom-field.entity';
import { DealStageHistory } from '@crm/entities/deal-stage-history.entity';
import { Deal } from '@crm/entities/deal.entity';
import { PipelineStage } from '@crm/entities/pipeline-stage.entity';
import { Pipeline } from '@crm/entities/pipeline.entity';
import { Industry } from './entities/industry.entity';
import { Segment } from '@crm/entities/segment.entity';
import { Tag } from '@crm/entities/tag.entity';
import { CrmTask } from '@crm/entities/task.entity';
import { Team } from '@crm/entities/team.entity';
import { CrmUser } from '@crm/entities/user.entity';
import { PipelinesController } from '@crm/pipelines.controller';
import { PipelinesService } from '@crm/pipelines.service';
import { IndustriesController } from '@crm/industries.controller';
import { IndustriesService } from '@crm/industries.service';
import { SegmentsController } from '@crm/segments.controller';
import { SegmentsService } from '@crm/segments.service';
import { TagsController } from '@crm/tags.controller';
import { TagsService } from '@crm/tags.service';
import { TeamsController } from '@crm/teams.controller';
import { TeamsService } from '@crm/teams.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contact,
      ContactActivity,
      Tag,
      CustomField,
      CrmTask,
      CrmUser,
      Team,
      Deal,
      Segment,
      Pipeline,
      PipelineStage,
      DealStageHistory,
      Industry,
      Company,
      Plan,
    ]),
    AuthModule,
  ],
  controllers: [
    ContactsController,
    TagsController,
    CustomFieldsController,
    CrmTasksController,
    CrmUsersController,
    TeamsController,
    DealsController,
    SegmentsController,
    PipelinesController,
    IndustriesController,
    CompaniesController,
  ],
  providers: [
    ContactsService,
    TagsService,
    CustomFieldsService,
    CrmTasksService,
    CrmUsersService,
    TeamsService,
    DealsService,
    SegmentsService,
    PipelinesService,
    IndustriesService,
    CompaniesService,
  ],
  exports: [
    ContactsService,
    TagsService,
    CustomFieldsService,
    CrmTasksService,
    CrmUsersService,
    TeamsService,
    DealsService,
    SegmentsService,
    PipelinesService,
    IndustriesService,
    CompaniesService,
  ],
})
export class CrmModule {}
