import { Business } from '@auth/entities/business.entity';
import { UpdateCompanyDto } from '@auth/dto/update-company.dto';
import { CompanyService } from '@auth/company.service';
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

@ApiTags('settings-company')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('settings/company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'Get current business company data' })
  @ApiOkResponse({ description: 'Company data' })
  get(@CurrentBusiness() business: Business) {
    return this.companyService.findOne(business.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update current business company data' })
  @ApiOkResponse({ description: 'Company updated' })
  update(@CurrentBusiness() business: Business, @Body() dto: UpdateCompanyDto) {
    return this.companyService.update(business.id, dto);
  }

  @Post('logo')
  @ApiOperation({ summary: 'Upload or replace the company logo' })
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(
    @CurrentBusiness() business: Business,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.companyService.uploadLogo(business.id, file);
  }

  @Delete('logo')
  @ApiOperation({ summary: 'Remove the company logo' })
  async removeLogo(@CurrentBusiness() business: Business) {
    await this.companyService.removeLogo(business.id);
    return { message: 'Logo eliminado correctamente' };
  }
}
