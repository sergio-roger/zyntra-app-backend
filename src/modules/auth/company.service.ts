import {
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_SIZE_BYTES,
} from '@auth/constants/logo-storage.constants';
import { UpdateCompanyDto } from '@auth/dto/update-company.dto';
import { Business } from '@auth/entities/business.entity';
import type { UploadableFile } from '@auth/interfaces/uploadable-file.interface';
import { LogoStorageService } from '@auth/logo-storage.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly logoStorage: LogoStorageService,
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

  async update(businessId: string, dto: UpdateCompanyDto): Promise<Business> {
    const business = await this.findOne(businessId);
    if (dto.name !== undefined) business.name = dto.name;
    if (dto.email !== undefined) business.email = dto.email;
    if (dto.phone !== undefined) business.phone = dto.phone;
    if (dto.address !== undefined) business.address = dto.address;
    if (dto.tax_id !== undefined) business.taxId = dto.tax_id;
    if (dto.website !== undefined) business.website = dto.website;
    return this.businessRepository.save(business);
  }

  async uploadLogo(
    businessId: string,
    file: UploadableFile | undefined,
  ): Promise<{ logoUrl: string }> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de archivo no permitido. Usa PNG, JPEG o WEBP.',
      );
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      throw new BadRequestException(
        'El archivo supera el tamaño máximo de 2MB.',
      );
    }

    const business = await this.findOne(businessId);
    const previousUrl = business.logoUrl;

    const logoUrl = await this.logoStorage.save(file);
    business.logoUrl = logoUrl;
    await this.businessRepository.save(business);

    if (previousUrl) {
      await this.logoStorage.delete(previousUrl);
    }

    return { logoUrl };
  }

  async removeLogo(businessId: string): Promise<void> {
    const business = await this.findOne(businessId);
    const currentUrl = business.logoUrl;

    business.logoUrl = null as unknown as string;
    await this.businessRepository.save(business);

    if (currentUrl) {
      await this.logoStorage.delete(currentUrl);
    }
  }
}
