import { PartialType } from '@nestjs/swagger';
import { CreateFormTemplateDto } from '@/modules/forms/dto/create-form-template.dto';

export class UpdateFormTemplateDto extends PartialType(CreateFormTemplateDto) {}
