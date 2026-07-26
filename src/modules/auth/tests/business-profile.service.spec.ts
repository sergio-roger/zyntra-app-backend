import { Repository } from 'typeorm';
import { BusinessProfileService } from '@auth/business-profile.service';
import { BusinessProfile } from '@auth/entities/business-profile.entity';
import { BusinessModel } from '@auth/enums/business-model.enum';
import { BrandTone } from '@auth/enums/brand-tone.enum';

const mockProfileRepo = () =>
  ({
    findOneBy: jest.fn(),
    create: jest.fn(
      (v: Partial<BusinessProfile>) => ({ ...v }) as BusinessProfile,
    ),
    save: jest.fn((v: BusinessProfile) => Promise.resolve(v)),
  }) as unknown as jest.Mocked<Repository<BusinessProfile>>;

const buildProfile = (
  overrides: Partial<BusinessProfile> = {},
): BusinessProfile =>
  ({
    id: 'profile-1',
    businessId: 'business-1',
    industryId: null,
    nicheDetail: '',
    valueProposition: '',
    mission: null,
    competitors: [],
    targetAudience: '',
    audienceAgeRange: null,
    businessModel: BusinessModel.B2C,
    tone: BrandTone.FRIENDLY,
    country: null,
    city: null,
    brandVoiceNotes: null,
    locale: 'es',
    brandColors: null,
    monthlyBudgetRange: null,
    activeChannels: [],
    teamSize: null,
    ...overrides,
  }) as BusinessProfile;

describe('BusinessProfileService', () => {
  let profileRepo: jest.Mocked<Repository<BusinessProfile>>;
  let service: BusinessProfileService;

  beforeEach(() => {
    profileRepo = mockProfileRepo();
    service = new BusinessProfileService(profileRepo);
  });

  describe('findOrCreate', () => {
    it('retorna el perfil existente', async () => {
      const profile = buildProfile();
      profileRepo.findOneBy.mockResolvedValue(profile);

      await expect(service.findOrCreate('business-1')).resolves.toBe(profile);
      expect(profileRepo.create).not.toHaveBeenCalled();
    });

    it('crea un perfil con defaults si no existe', async () => {
      profileRepo.findOneBy.mockResolvedValue(null);

      const result = await service.findOrCreate('business-1');

      expect(profileRepo.create).toHaveBeenCalledWith({
        businessId: 'business-1',
      });
      expect(result.businessId).toBe('business-1');
    });
  });

  describe('update', () => {
    it('solo sobreescribe los campos presentes en el dto', async () => {
      const profile = buildProfile({ nicheDetail: 'Old niche' });
      profileRepo.findOneBy.mockResolvedValue(profile);

      const result = await service.update('business-1', {
        nicheDetail: 'New niche',
      });

      expect(result.nicheDetail).toBe('New niche');
      expect(result.valueProposition).toBe('');
    });

    it('actualiza campos de las 4 secciones (identidad, audiencia, marca, objetivos)', async () => {
      const profile = buildProfile();
      profileRepo.findOneBy.mockResolvedValue(profile);

      const result = await service.update('business-1', {
        industryId: 'industry-1',
        businessModel: BusinessModel.B2B,
        tone: BrandTone.LUXURY,
        teamSize: 12,
      });

      expect(result.industryId).toBe('industry-1');
      expect(result.businessModel).toBe(BusinessModel.B2B);
      expect(result.tone).toBe(BrandTone.LUXURY);
      expect(result.teamSize).toBe(12);
    });

    it('crea el perfil primero si no existía y luego aplica el update', async () => {
      profileRepo.findOneBy.mockResolvedValue(null);

      const result = await service.update('business-1', {
        nicheDetail: 'Niche',
      });

      expect(profileRepo.create).toHaveBeenCalledWith({
        businessId: 'business-1',
      });
      expect(result.nicheDetail).toBe('Niche');
    });

    it('permite limpiar competitors y activeChannels con arrays vacíos', async () => {
      const profile = buildProfile({
        competitors: ['A', 'B'],
        activeChannels: ['web_chat'],
      });
      profileRepo.findOneBy.mockResolvedValue(profile);

      const result = await service.update('business-1', {
        competitors: [],
        activeChannels: [],
      });

      expect(result.competitors).toEqual([]);
      expect(result.activeChannels).toEqual([]);
    });
  });
});
