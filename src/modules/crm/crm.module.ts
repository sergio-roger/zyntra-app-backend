import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@auth/auth.module';
import { Contact } from './entities/contact.entity';
import { ContactActivity } from './entities/contact-activity.entity';
import { Tag } from './entities/tag.entity';
import { CustomField } from './entities/custom-field.entity';
import { CrmTask } from './entities/task.entity';
import { CrmUser } from './entities/user.entity';
import { Team } from './entities/team.entity';
import { Deal } from './entities/deal.entity';
import { Segment } from './entities/segment.entity';
import { Pipeline } from './entities/pipeline.entity';
import { PipelineStage } from './entities/pipeline-stage.entity';
import { DealStageHistory } from './entities/deal-stage-history.entity';
import { ContactsService } from './contacts.service';
import { TagsService } from './tags.service';
import { CustomFieldsService } from './custom-fields.service';
import { CrmTasksService } from './crm-tasks.service';
import { CrmUsersService } from './crm-users.service';
import { TeamsService } from './teams.service';
import { DealsService } from './deals.service';
import { SegmentsService } from './segments.service';
import { PipelinesService } from './pipelines.service';
import { ContactsController } from './contacts.controller';
import { TagsController } from './tags.controller';
import { CustomFieldsController } from './custom-fields.controller';
import { CrmTasksController } from './crm-tasks.controller';
import { CrmUsersController } from './crm-users.controller';
import { TeamsController } from './teams.controller';
import { DealsController } from './deals.controller';
import { SegmentsController } from './segments.controller';
import { PipelinesController } from './pipelines.controller';

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
  ],
})
export class CrmModule {}
