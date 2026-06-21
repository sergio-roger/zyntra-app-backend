import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@crm/enums/user-role.enum';
import { AuthService } from './auth.service';

@ApiTags('settings-permissions')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('settings')
export class SettingsPermissionsController {
  constructor(private readonly authService: AuthService) {}

  @Get('roles')
  @ApiOperation({ summary: 'Get all user roles' })
  getAllRoles() {
    return this.authService.getAllRoles();
  }

  @Get('menus')
  @ApiOperation({ summary: 'Get all system menus' })
  getAllMenus() {
    return this.authService.getAllMenus();
  }

  @Get('permissions/:role')
  @ApiOperation({ summary: 'Get permissions by role name' })
  async getPermissionsByRole(@Param('role') role: string) {
    if (!['manager', 'agent'].includes(role)) {
      throw new BadRequestException('Invalid role name');
    }
    const menuIds = await this.authService.getPermissionsByRole(role);
    return { role, menu_ids: menuIds };
  }

  @Put('permissions/:role')
  @ApiOperation({ summary: 'Update permissions by role name' })
  async updatePermissionsByRole(
    @Param('role') role: string,
    @Body() body: { menu_ids: string[] },
  ) {
    if (!['manager', 'agent'].includes(role)) {
      throw new BadRequestException('Invalid role name');
    }
    await this.authService.updatePermissionsByRole(role, body.menu_ids);
    return { success: true };
  }
}
