import { PartialType } from '@nestjs/swagger';
import { CreateSectorTypeDto } from './create-sector-type.dto';

export class UpdateSectorTypeDto extends PartialType(CreateSectorTypeDto) {}
