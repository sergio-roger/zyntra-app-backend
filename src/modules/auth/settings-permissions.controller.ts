import { AuthService } from '@auth/auth.service';
import { Business } from '@auth/entities/business.entity';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@crm/enums/user-role.enum';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('settings-permissions')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('settings')
export class SettingsPermissionsController {
  constructor(private readonly authService: AuthService) {}

  @Post('roles')
  @ApiOperation({ summary: 'Create a new user role' })
  createRole(
    @Body()
    body: {
      name: string;
      label: string;
      description?: string;
      badge?: string;
      badgeColor?: string;
      iconColor?: string;
    },
  ) {
    return this.authService.createRole(body);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all user roles' })
  getAllRoles(@CurrentBusiness() business: Business) {
    return this.authService.getAllRoles(business);
  }

  @Get('menus')
  @ApiOperation({ summary: 'Get all system menus' })
  getAllMenus() {
    return this.authService.getAllMenus();
  }

  @Get('permissions/:role')
  @ApiOperation({ summary: 'Get permissions by role name' })
  async getPermissionsByRole(
    @Param('role') role: string,
    @CurrentBusiness() business: Business,
  ) {
    const exists = await this.authService.roleExists(role);
    if (!exists) {
      throw new BadRequestException('Invalid role name');
    }
    const menuIds = await this.authService.getPermissionsByRole(
      role,
      business.id,
    );
    return { role, menu_ids: menuIds };
  }

  @Put('permissions/:role')
  @ApiOperation({ summary: 'Update permissions by role name' })
  async updatePermissionsByRole(
    @Param('role') role: string,
    @Body() body: { menu_ids: string[] },
    @CurrentBusiness() business: Business,
  ) {
    const exists = await this.authService.roleExists(role);
    if (!exists) {
      throw new BadRequestException('Invalid role name');
    }
    await this.authService.updatePermissionsByRole(
      role,
      body.menu_ids,
      business.id,
    );
    return { success: true };
  }
}
