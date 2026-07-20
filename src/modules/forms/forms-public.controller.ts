import { Public } from '@common/decorators/public.decorator';
import { SubmitFormDto } from '@/modules/forms/dto/submit-form.dto';
import { FormSubmissionsService } from '@/modules/forms/form-submissions.service';
import { FormTemplatesService } from '@/modules/forms/form-templates.service';
import { FormRateLimitGuard } from '@/modules/forms/guards/form-rate-limit.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('forms-public')
@Public()
@Controller('forms/public')
export class FormsPublicController {
  constructor(
    private readonly templatesService: FormTemplatesService,
    private readonly submissionsService: FormSubmissionsService,
  ) {}

  @Get(':businessId/:slug')
  @ApiOperation({
    summary: 'Config pública de un formulario publicado, para renderizarlo',
  })
  @ApiOkResponse({ description: 'Campos y metadata del formulario' })
  getConfig(
    @Param('businessId') businessId: string,
    @Param('slug') slug: string,
  ) {
    return this.templatesService.getPublicConfig(businessId, slug);
  }

  @Post(':businessId/:slug/submit')
  @UseGuards(FormRateLimitGuard)
  @ApiOperation({ summary: 'Recibe el envío de un formulario público' })
  @ApiCreatedResponse({ description: 'Envío persistido' })
  submit(
    @Param('businessId') businessId: string,
    @Param('slug') slug: string,
    @Body() dto: SubmitFormDto,
  ) {
    return this.submissionsService.submitPublic(businessId, slug, dto);
  }
}
