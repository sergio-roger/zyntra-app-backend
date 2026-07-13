import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Public } from '@common/decorators/public.decorator';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import { UserRole } from '@crm/enums/user-role.enum';
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '@auth/auth.service';
import {
  AuthResponseDto,
  LogoutResponseDto,
} from '@auth/dto/auth-response.dto';
import { ChangePasswordDto } from '@auth/dto/change-password.dto';
import { ForgotPasswordDto } from '@auth/dto/forgot-password.dto';
import { LoginDto } from '@auth/dto/login.dto';
import { RegisterDto } from '@auth/dto/register.dto';
import { ResetPasswordDto } from '@auth/dto/reset-password.dto';
import { UpdateProfileDto } from '@auth/dto/update-profile.dto';
import { Business } from '@auth/entities/business.entity';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new business and its first admin user' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req: RequestWithUser,
  ) {
    const { access_token, user } = await this.authService.register(registerDto);
    if (req.session) {
      req.session.jwt = access_token;
    }
    return user;
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login as a user' })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(@Body() loginDto: LoginDto, @Request() req: RequestWithUser) {
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const ua = req.headers['user-agent'] ?? 'unknown';
    this.logger.log(
      `LOGIN attempt | email=${loginDto.email} ip=${ip} ua=${ua}`,
    );

    try {
      const { access_token, user } = await this.authService.login(loginDto);
      if (req.session) {
        req.session.jwt = access_token;
      }
      this.logger.log(
        `LOGIN success | email=${loginDto.email} id=${user.id} role=${user.role}`,
      );
      return user;
    } catch (err) {
      this.logger.warn(
        `LOGIN failed  | email=${loginDto.email} ip=${ip} reason=${(err as Error).message}`,
      );
      throw err;
    }
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout' })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(@Request() req: RequestWithUser) {
    req.session = null;
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiOkResponse({ type: LogoutResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      message: 'If the email is registered, a reset link will be sent shortly.',
    };
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiOkResponse({ type: LogoutResponseDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Password reset successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh session token' })
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(@Request() req: RequestWithUser) {
    const { access_token, user } = await this.authService.refresh(req.user.id);
    if (req.session) {
      req.session.jwt = access_token;
    }
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: AuthResponseDto })
  async getProfile(@Request() req: RequestWithUser) {
    return this.authService.getSelfProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own profile' })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Request() req: RequestWithUser,
  ) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload or replace own avatar' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser,
  ) {
    return this.authService.uploadAvatar(req.user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove own avatar' })
  async removeAvatar(@Request() req: RequestWithUser) {
    await this.authService.removeAvatar(req.user.id);
    return { message: 'Avatar eliminado correctamente' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Request() req: RequestWithUser,
  ) {
    await this.authService.changePassword(req.user.id, dto);
    return { message: 'Contraseña actualizada correctamente' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('menus')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get menu tree filtered by role and plan' })
  @ApiOkResponse({ description: 'Menu tree for the authenticated user' })
  async getMenus(
    @Request() req: RequestWithUser,
    @CurrentBusiness() business: Business,
  ) {
    return this.authService.getMenuTree(
      req.user.role as UserRole,
      business.id,
      business.planId,
    );
  }
}
