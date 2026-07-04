import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { UpdateCompanyDto } from '@auth/dto/update-company.dto';
import {
  ALLOWED_LOGO_MIME_TYPES,
  LogoStorageService,
  MAX_LOGO_SIZE_BYTES,
} from '@auth/logo-storage.service';
import type { UploadableFile } from '@auth/avatar-storage.service';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly logoStorage: LogoStorageService,
  ) {}

  async findOne(businessId: string): Promise<Business> {
    const business = await this.businessRepository.findOneBy({ id: businessId });
    if (!business) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return business;
  }

  async update(businessId: string, dto: UpdateCompanyDto): Promise<Business> {
    const business = await this.findOne(businessId);
    Object.assign(business, dto);
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
      throw new BadRequestException('El archivo supera el tamaño máximo de 2MB.');
    }

    const business = await this.findOne(businessId);
    const previousUrl = business.logo_url;

    const logoUrl = await this.logoStorage.save(file);
    business.logo_url = logoUrl;
    await this.businessRepository.save(business);

    if (previousUrl) {
      await this.logoStorage.delete(previousUrl);
    }

    return { logoUrl };
  }

  async removeLogo(businessId: string): Promise<void> {
    const business = await this.findOne(businessId);
    const currentUrl = business.logo_url;

    business.logo_url = null as unknown as string;
    await this.businessRepository.save(business);

    if (currentUrl) {
      await this.logoStorage.delete(currentUrl);
    }
  }
}
