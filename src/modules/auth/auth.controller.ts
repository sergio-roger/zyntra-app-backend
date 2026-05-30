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
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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

  @Post('login')
  @ApiOperation({ summary: 'Login as a business' })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(@Body() loginDto: LoginDto, @Request() req: RequestWithUser) {
    const { access_token, user } = await this.authService.login(loginDto);
    if (req.session) {
      req.session.jwt = access_token;
    }
    return user;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout business' })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(@Request() req: RequestWithUser) {
    req.session = null;
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiOkResponse({ type: LogoutResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      message: 'If the email is registered, a reset link will be sent shortly.',
    };
  }

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
  @ApiOperation({ summary: 'Get current business profile' })
  @ApiOkResponse({ type: AuthResponseDto })
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }
}
