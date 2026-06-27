import { PartialType } from '@nestjs/swagger';
import { CreateSectorTipoDto } from './create-sector-tipo.dto';

export class UpdateSectorTipoDto extends PartialType(CreateSectorTipoDto) {}
