import { Business } from '@auth/entities/business.entity';
import { UpdateBusinessDto } from '@auth/dto/update-business.dto';
import { BusinessService } from '@auth/business.service';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@crm/enums/user-role.enum';
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('settings-business')
@ApiBearerAuth()
@Controller('settings/business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current business data (any authenticated role)',
  })
  @ApiOkResponse({ description: 'Business data' })
  get(@CurrentBusiness() business: Business) {
    return this.businessService.findOne(business.id);
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update current business data (admin only)' })
  @ApiOkResponse({ description: 'Business updated' })
  update(
    @CurrentBusiness() business: Business,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessService.update(business.id, dto);
  }

  @Post('logo')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload or replace the business logo (admin only)' })
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(
    @CurrentBusiness() business: Business,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.businessService.uploadLogo(business.id, file);
  }

  @Delete('logo')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove the business logo (admin only)' })
  async removeLogo(@CurrentBusiness() business: Business) {
    await this.businessService.removeLogo(business.id);
    return { message: 'Logo eliminado correctamente' };
  }

  @Post('cover')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Upload or replace the business cover image (admin only)',
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadCover(
    @CurrentBusiness() business: Business,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.businessService.uploadCover(business.id, file);
  }

  @Delete('cover')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove the business cover image (admin only)' })
  async removeCover(@CurrentBusiness() business: Business) {
    await this.businessService.removeCover(business.id);
    return { message: 'Portada eliminada correctamente' };
  }
}
