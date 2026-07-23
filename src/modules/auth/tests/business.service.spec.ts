import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BusinessService } from '@auth/business.service';
import { Business } from '@auth/entities/business.entity';
import { LogoStorageService } from '@auth/logo-storage.service';
import type { UploadableFile } from '@auth/interfaces/uploadable-file.interface';

const mockBusinessRepo = () =>
  ({
    findOneBy: jest.fn(),
    save: jest.fn((v: Business) => Promise.resolve(v)),
  }) as unknown as jest.Mocked<Repository<Business>>;

const mockLogoStorage = () =>
  ({
    save: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<LogoStorageService>;

const buildBusiness = (
  overrides: Partial<Record<keyof Business, unknown>> = {},
): Business =>
  ({
    id: 'business-1',
    name: 'Acme',
    email: null,
    phone: null,
    address: null,
    taxId: null,
    website: null,
    logoUrl: null,
    ...overrides,
  }) as Business;

describe('BusinessService', () => {
  let businessRepo: jest.Mocked<Repository<Business>>;
  let logoStorage: jest.Mocked<LogoStorageService>;
  let service: BusinessService;

  beforeEach(() => {
    businessRepo = mockBusinessRepo();
    logoStorage = mockLogoStorage();
    service = new BusinessService(businessRepo, logoStorage);
  });

  describe('findOne', () => {
    it('retorna la business cuando existe', async () => {
      const business = buildBusiness();
      businessRepo.findOneBy.mockResolvedValue(business);

      await expect(service.findOne('business-1')).resolves.toBe(business);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      businessRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('solo sobreescribe los campos presentes en el dto', async () => {
      const business = buildBusiness({ name: 'Old', taxId: 'OLD-TAX' });
      businessRepo.findOneBy.mockResolvedValue(business);

      const result = await service.update('business-1', { name: 'New' });

      expect(result.name).toBe('New');
      expect(result.taxId).toBe('OLD-TAX');
    });

    it('actualiza taxId cuando viene en el dto', async () => {
      const business = buildBusiness({ taxId: 'OLD-TAX' });
      businessRepo.findOneBy.mockResolvedValue(business);

      const result = await service.update('business-1', {
        taxId: 'NEW-TAX',
      });

      expect(result.taxId).toBe('NEW-TAX');
    });
  });

  describe('uploadLogo', () => {
    const validFile: UploadableFile = {
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('fake'),
    } as UploadableFile;

    it('rechaza si no se envía archivo', async () => {
      await expect(
        service.uploadLogo('business-1', undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza mimetypes no permitidos', async () => {
      await expect(
        service.uploadLogo('business-1', {
          ...validFile,
          mimetype: 'application/pdf',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza archivos que superan el tamaño máximo', async () => {
      await expect(
        service.uploadLogo('business-1', {
          ...validFile,
          size: 3 * 1024 * 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('guarda el logo nuevo y borra el anterior', async () => {
      const business = buildBusiness({ logoUrl: 'https://old-logo.png' });
      businessRepo.findOneBy.mockResolvedValue(business);
      logoStorage.save.mockResolvedValue('https://new-logo.png');

      const result = await service.uploadLogo('business-1', validFile);

      expect(result).toEqual({ logoUrl: 'https://new-logo.png' });
      expect(logoStorage.delete).toHaveBeenCalledWith(
        'https://old-logo.png',
      );
    });

    it('no intenta borrar nada si no había logo previo', async () => {
      const business = buildBusiness({ logoUrl: null });
      businessRepo.findOneBy.mockResolvedValue(business);
      logoStorage.save.mockResolvedValue('https://new-logo.png');

      await service.uploadLogo('business-1', validFile);

      expect(logoStorage.delete).not.toHaveBeenCalled();
    });
  });

  describe('removeLogo', () => {
    it('limpia logoUrl y borra el archivo almacenado', async () => {
      const business = buildBusiness({ logoUrl: 'https://old-logo.png' });
      businessRepo.findOneBy.mockResolvedValue(business);

      await service.removeLogo('business-1');

      expect(business.logoUrl).toBeNull();
      expect(logoStorage.delete).toHaveBeenCalledWith(
        'https://old-logo.png',
      );
    });

    it('no falla si no había logo', async () => {
      const business = buildBusiness({ logoUrl: null });
      businessRepo.findOneBy.mockResolvedValue(business);

      await service.removeLogo('business-1');

      expect(logoStorage.delete).not.toHaveBeenCalled();
    });
  });
});
