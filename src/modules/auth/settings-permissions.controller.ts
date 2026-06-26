import { AuthService } from '@auth/auth.service';
import { Business } from '@auth/entities/business.entity';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@crm/enums/user-role.enum';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('settings-permissions')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('settings')
export class SettingsPermissionsController {
  constructor(private readonly authService: AuthService) {}

  @Post('roles')
  @ApiOperation({ summary: 'Create a new user role' })
  @ApiCreatedResponse({ description: 'Role created' })
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
    @CurrentBusiness() business: Business,
  ) {
    return this.authService.createRole(body, business.id);
  }

  @Put('roles/:name')
  @ApiOperation({ summary: 'Update an existing user role' })
  @ApiOkResponse({ description: 'Role updated' })
  updateRole(
    @Param('name') name: string,
    @Body()
    body: {
      label: string;
      description?: string;
      badge?: string;
      badgeColor?: string;
      iconColor?: string;
    },
    @CurrentBusiness() business: Business,
  ) {
    return this.authService.updateRole(name, body, business.id);
  }

  @Delete('roles/:name')
  @ApiOperation({ summary: 'Delete an existing user role' })
  @ApiNoContentResponse({ description: 'Role deleted' })
  async deleteRole(
    @Param('name') name: string,
    @CurrentBusiness() business: Business,
  ) {
    await this.authService.deleteRole(name, business.id);
    return { success: true };
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all user roles' })
  @ApiOkResponse({ description: 'List of roles' })
  getAllRoles(@CurrentBusiness() business: Business) {
    return this.authService.getAllRoles(business);
  }

  @Get('menus')
  @ApiOperation({ summary: 'Get all system menus' })
  @ApiOkResponse({ description: 'List of menus' })
  getAllMenus() {
    return this.authService.getAllMenus();
  }

  @Get('permissions/:role')
  @ApiOperation({ summary: 'Get permissions by role name' })
  @ApiOkResponse({ description: 'Permissions for the role' })
  async getPermissionsByRole(
    @Param('role') role: string,
    @CurrentBusiness() business: Business,
  ) {
    const exists = await this.authService.roleExists(role, business.id);
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
  @ApiOkResponse({ description: 'Permissions updated' })
  async updatePermissionsByRole(
    @Param('role') role: string,
    @Body() body: { menu_ids: string[] },
    @CurrentBusiness() business: Business,
  ) {
    const exists = await this.authService.roleExists(role, business.id);
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
