import { StorageClientService } from '@/storage-client/storage-client.service';
import {
  ALLOWED_AVATAR_MIME_TYPES,
  AvatarStorageService,
  MAX_AVATAR_SIZE_BYTES,
  UploadableFile,
} from '@auth/avatar-storage.service';
import { ChangePasswordDto } from '@auth/dto/change-password.dto';
import { UpdateProfileDto } from '@auth/dto/update-profile.dto';
import { User } from '@auth/entities/user.entity';
import { SelfProfile } from '@auth/interfaces/self-profile.interface';
import { validateFile } from '@auth/utils/file-validation.util';
import { hashPassword, verifyPassword } from '@auth/utils/password.util';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private avatarStorage: AvatarStorageService,
    private storageClient: StorageClientService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findActiveByEmailWithBusiness(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase(), isActive: true },
      relations: ['business', 'business.plan_object'],
    });
  }

  async findByIdWithBusiness(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['business', 'business.plan_object'],
    });
  }

  private async findSelfUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['business', 'business.plan_object', 'teams'],
    });
  }

  private async toSelfProfile(user: User): Promise<SelfProfile> {
    let avatarUrl: string | null = null;
    if (user.avatarFileId) {
      try {
        avatarUrl = await this.storageClient.getSignedUrl(
          user.businessId,
          user.avatarFileId,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to get signed URL for user ${user.id} avatar file ${user.avatarFileId}: ${(err as Error).message}`,
        );
      }
    }

    return {
      id: user.id,
      businessId: user.businessId,
      name: user.name,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      email: user.email,
      role: user.role,
      plan: user.business?.plan_object ?? null,
      plan_status: user.business?.plan_status,
      avatarUrl: avatarUrl || user.avatarUrl || null,
      jobTitle: user.jobTitle ?? null,
      phone: user.phone ?? null,
      bio: user.bio ?? null,
      isAccountActivated: user.isAccountActivated,
      status: user.status,
      activatedAt: user.activatedAt ?? null,
      teams: (user.teams ?? []).map((team) => ({
        id: team.id,
        name: team.name,
        color: team.color,
      })),
      createdAt: user.createdAt,
    };
  }

  async getSelfProfile(userId: string): Promise<SelfProfile> {
    const user = await this.findSelfUser(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.toSelfProfile(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<SelfProfile> {
    const user = await this.findSelfUser(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.jobTitle !== undefined) user.jobTitle = dto.jobTitle;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.bio !== undefined) user.bio = dto.bio;
    await this.userRepository.save(user);
    return this.toSelfProfile(user);
  }

  async updatePasswordHash(userId: string, newPassword: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    user.passwordHash = await hashPassword(newPassword);
    await this.userRepository.save(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    const user = await this.findByIdWithBusiness(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const isValid =
      !!user.passwordHash &&
      (await verifyPassword(user.passwordHash, dto.currentPassword));
    if (!isValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    user.passwordHash = await hashPassword(dto.newPassword);
    await this.userRepository.save(user);
  }

  async uploadAvatar(
    userId: string,
    file: UploadableFile | undefined,
  ): Promise<{ avatarUrl: string; avatarFileId: string }> {
    validateFile(file, {
      allowedMimeTypes: ALLOWED_AVATAR_MIME_TYPES,
      maxSizeBytes: MAX_AVATAR_SIZE_BYTES,
      maxSizeLabel: '2MB',
      allowedFormatsLabel: 'PNG, JPEG o WEBP',
    });

    const user = await this.findByIdWithBusiness(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const previousFileId = user.avatarFileId;

    const multerFile = file as Express.Multer.File;
    if (!multerFile.originalname) {
      multerFile.originalname = 'avatar';
    }

    const storageFile = await this.storageClient.uploadFile(
      user.businessId,
      multerFile,
      'users',
      user.id,
    );

    user.avatarFileId = storageFile.id;
    user.avatarUrl = null;

    const [avatarUrl] = await Promise.all([
      this.storageClient.getSignedUrl(user.businessId, storageFile.id),
      this.userRepository.save(user),
      previousFileId
        ? this.storageClient
            .deleteFile(user.businessId, previousFileId)
            .catch(() => undefined)
        : Promise.resolve(),
    ]);

    return { avatarUrl, avatarFileId: storageFile.id };
  }

  async removeAvatar(userId: string): Promise<void> {
    const user = await this.findByIdWithBusiness(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const currentFileId = user.avatarFileId;
    const currentUrl = user.avatarUrl;

    user.avatarFileId = null;
    user.avatarUrl = null;

    const deletePromises: Promise<any>[] = [this.userRepository.save(user)];
    if (currentFileId) {
      deletePromises.push(
        this.storageClient
          .deleteFile(user.businessId, currentFileId)
          .catch(() => undefined),
      );
    }
    if (currentUrl) {
      deletePromises.push(
        this.avatarStorage.delete(currentUrl).catch(() => undefined),
      );
    }

    await Promise.all(deletePromises);
  }
}
