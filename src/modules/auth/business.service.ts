import {
  ALLOWED_COVER_MIME_TYPES,
  MAX_COVER_SIZE_BYTES,
} from '@auth/constants/cover-storage.constants';
import {
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_SIZE_BYTES,
} from '@auth/constants/logo-storage.constants';
import { UpdateBusinessDto } from '@auth/dto/update-business.dto';
import { Business } from '@auth/entities/business.entity';
import type { UploadableFile } from '@auth/interfaces/uploadable-file.interface';
import { CoverStorageService } from '@auth/cover-storage.service';
import { LogoStorageService } from '@auth/logo-storage.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

type BusinessImageField = 'logoUrl' | 'coverUrl';

interface ImageStorage {
  save(file: UploadableFile): Promise<string>;
  delete(url: string): Promise<void>;
}

interface ReplaceImageOptions {
  storage: ImageStorage;
  allowedTypes: string[];
  maxSizeBytes: number;
  maxSizeLabel: string;
  field: BusinessImageField;
}

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly logoStorage: LogoStorageService,
    private readonly coverStorage: CoverStorageService,
  ) {}

  async findOne(businessId: string): Promise<Business> {
    const business = await this.businessRepository.findOneBy({
      id: businessId,
    });
    if (!business) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return business;
  }

  async update(businessId: string, dto: UpdateBusinessDto): Promise<Business> {
    const business = await this.findOne(businessId);
    if (dto.name !== undefined) business.name = dto.name;
    if (dto.email !== undefined) business.email = dto.email;
    if (dto.phone !== undefined) business.phone = dto.phone;
    if (dto.address !== undefined) business.address = dto.address;
    if (dto.taxId !== undefined) business.taxId = dto.taxId;
    if (dto.website !== undefined) business.website = dto.website;
    return this.businessRepository.save(business);
  }

  async uploadLogo(
    businessId: string,
    file: UploadableFile | undefined,
  ): Promise<{ logoUrl: string }> {
    const logoUrl = await this.replaceImage(businessId, file, {
      storage: this.logoStorage,
      allowedTypes: ALLOWED_LOGO_MIME_TYPES,
      maxSizeBytes: MAX_LOGO_SIZE_BYTES,
      maxSizeLabel: '2MB',
      field: 'logoUrl',
    });
    return { logoUrl };
  }

  async removeLogo(businessId: string): Promise<void> {
    await this.clearImage(businessId, this.logoStorage, 'logoUrl');
  }

  async uploadCover(
    businessId: string,
    file: UploadableFile | undefined,
  ): Promise<{ coverUrl: string }> {
    const coverUrl = await this.replaceImage(businessId, file, {
      storage: this.coverStorage,
      allowedTypes: ALLOWED_COVER_MIME_TYPES,
      maxSizeBytes: MAX_COVER_SIZE_BYTES,
      maxSizeLabel: '5MB',
      field: 'coverUrl',
    });
    return { coverUrl };
  }

  async removeCover(businessId: string): Promise<void> {
    await this.clearImage(businessId, this.coverStorage, 'coverUrl');
  }

  private async replaceImage(
    businessId: string,
    file: UploadableFile | undefined,
    options: ReplaceImageOptions,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    if (!options.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de archivo no permitido. Usa PNG, JPEG o WEBP.',
      );
    }
    if (file.size > options.maxSizeBytes) {
      throw new BadRequestException(
        `El archivo supera el tamaño máximo de ${options.maxSizeLabel}.`,
      );
    }

    const business = await this.findOne(businessId);
    const previousUrl = business[options.field];

    const url = await options.storage.save(file);
    business[options.field] = url;
    await this.businessRepository.save(business);

    if (previousUrl) {
      await options.storage.delete(previousUrl);
    }

    return url;
  }

  private async clearImage(
    businessId: string,
    storage: ImageStorage,
    field: BusinessImageField,
  ): Promise<void> {
    const business = await this.findOne(businessId);
    const currentUrl = business[field];

    business[field] = null as unknown as string;
    await this.businessRepository.save(business);

    if (currentUrl) {
      await storage.delete(currentUrl);
    }
  }
}
