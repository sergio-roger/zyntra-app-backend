import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto, LogoutResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { CurrentCrmUser } from '@common/decorators/current-crm-user.decorator';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import { Business } from './entities/business.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new business' })
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
  @ApiOperation({ summary: 'Login as a business or CRM user' })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(@Body() loginDto: LoginDto, @Request() req: RequestWithUser) {
    const { access_token, user } = await this.authService.login(loginDto);
    if (req.session) {
      req.session.jwt = access_token;
    }
    return user;
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
  refresh(@Request() req: RequestWithUser) {
    const { access_token, user } = this.authService.refresh(req.user);
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
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('menus')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get menu tree filtered by role and plan' })
  async getMenus(
    @CurrentCrmUser() caller: { id: string | null; role: string },
    @CurrentBusiness() business: Business,
  ) {
    return this.authService.getMenuTree(
      caller.role as any,
      business.id,
      business.plan_id,
    );
  }
}
