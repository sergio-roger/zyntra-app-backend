import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Business, PlanStatus } from './entities/business.entity';
import { Plan } from './entities/plan.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// TODO: Replace with persisted PasswordResetToken entity + email delivery (SMTP/Resend).
// In-memory store is fine for dev / single-instance only.
type ResetEntry = { businessId: string; expiresAt: number };
const resetTokens = new Map<string, ResetEntry>();
const RESET_TTL_MS = 30 * 60 * 1000; // 30 min

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    private jwtService: JwtService,
  ) { }

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;
    const normalizedEmail = email.toLowerCase();

    const existingBusiness = await this.businessRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existingBusiness) {
      throw new ConflictException('Email already registered');
    }

    // Assign default plan (Impulse Pro)
    const defaultPlan = await this.planRepository.findOne({
      where: { name: 'Impulse Pro' },
    });

    const password_hash = await bcrypt.hash(password, 10);
    const trial_ends_at = new Date();
    trial_ends_at.setDate(trial_ends_at.getDate() + 14);

    const business = this.businessRepository.create({
      name,
      email: normalizedEmail,
      password_hash,
      plan_id: defaultPlan?.id,
      plan_status: PlanStatus.TRIAL,
      trial_ends_at,
    });

    const savedBusiness = await this.businessRepository.save(business);

    const reloaded = await this.validateBusiness(savedBusiness.id);
    return this.generateToken(reloaded!);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const normalizedEmail = email.toLowerCase();

    const business = await this.businessRepository.findOne({
      where: { email: normalizedEmail },
      relations: ['plan_object'],
    });

    if (
      !business ||
      !(await bcrypt.compare(password, business.password_hash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(business);
  }

  refresh(business: Business) {
    return this.generateToken(business);
  }

  private generateToken(business: Business) {
    const payload = {
      sub: business.id,
      email: business.email,
      plan: business.plan_object?.name || 'none',
      plan_status: business.plan_status,
      business_id: business.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: business.id,
        name: business.name,
        email: business.email,
        plan: business.plan_object,
        plan_status: business.plan_status,
      },
    };
  }

  async validateBusiness(id: string): Promise<Business | null> {
    return this.businessRepository.findOne({
      where: { id },
      relations: ['plan_object'],
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const business = await this.businessRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!business) return;

    const token = randomBytes(32).toString('hex');
    resetTokens.set(token, {
      businessId: business.id,
      expiresAt: Date.now() + RESET_TTL_MS,
    });

    // TODO: Replace with real email delivery (Resend / SMTP).
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    this.logger.warn(
      `[DEV] Password reset link for ${business.email}: ${link}`,
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      resetTokens.delete(token);
      throw new BadRequestException('Invalid or expired reset token');
    }

    const business = await this.businessRepository.findOne({
      where: { id: entry.businessId },
    });
    if (!business) {
      resetTokens.delete(token);
      throw new BadRequestException('Invalid or expired reset token');
    }

    business.password_hash = await bcrypt.hash(newPassword, 10);
    await this.businessRepository.save(business);
    resetTokens.delete(token);
  }
}
