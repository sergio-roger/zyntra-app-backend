import { UpdateBusinessProfileDto } from '@auth/dto/update-business-profile.dto';
import { BusinessProfile } from '@auth/entities/business-profile.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class BusinessProfileService {
  constructor(
    @InjectRepository(BusinessProfile)
    private readonly profileRepository: Repository<BusinessProfile>,
  ) {}

  async findOrCreate(businessId: string): Promise<BusinessProfile> {
    const existing = await this.profileRepository.findOneBy({ businessId });
    if (existing) {
      return existing;
    }
    return this.profileRepository.save(
      this.profileRepository.create({ businessId }),
    );
  }

  async update(
    businessId: string,
    dto: UpdateBusinessProfileDto,
  ): Promise<BusinessProfile> {
    const profile = await this.findOrCreate(businessId);
    this.applyIdentityFields(profile, dto);
    this.applyAudienceFields(profile, dto);
    this.applyBrandFields(profile, dto);
    this.applyGoalFields(profile, dto);
    return this.profileRepository.save(profile);
  }

  private applyIdentityFields(
    profile: BusinessProfile,
    dto: UpdateBusinessProfileDto,
  ): void {
    if (dto.industryId !== undefined) profile.industryId = dto.industryId;
    if (dto.nicheDetail !== undefined) profile.nicheDetail = dto.nicheDetail;
    if (dto.valueProposition !== undefined)
      profile.valueProposition = dto.valueProposition;
    if (dto.mission !== undefined) profile.mission = dto.mission;
    if (dto.competitors !== undefined) profile.competitors = dto.competitors;
  }

  private applyAudienceFields(
    profile: BusinessProfile,
    dto: UpdateBusinessProfileDto,
  ): void {
    if (dto.targetAudience !== undefined)
      profile.targetAudience = dto.targetAudience;
    if (dto.audienceAgeRange !== undefined)
      profile.audienceAgeRange = dto.audienceAgeRange;
    if (dto.businessModel !== undefined)
      profile.businessModel = dto.businessModel;
    if (dto.geographicScope !== undefined)
      profile.geographicScope = dto.geographicScope;
    if (dto.country !== undefined) profile.country = dto.country;
    if (dto.city !== undefined) profile.city = dto.city;
  }

  private applyBrandFields(
    profile: BusinessProfile,
    dto: UpdateBusinessProfileDto,
  ): void {
    if (dto.tone !== undefined) profile.tone = dto.tone;
    if (dto.brandVoiceNotes !== undefined)
      profile.brandVoiceNotes = dto.brandVoiceNotes;
    if (dto.locale !== undefined) profile.locale = dto.locale;
    if (dto.brandColors !== undefined) profile.brandColors = dto.brandColors;
  }

  private applyGoalFields(
    profile: BusinessProfile,
    dto: UpdateBusinessProfileDto,
  ): void {
    if (dto.primaryGoal !== undefined) profile.primaryGoal = dto.primaryGoal;
    if (dto.monthlyBudgetRange !== undefined)
      profile.monthlyBudgetRange = dto.monthlyBudgetRange;
    if (dto.activeChannels !== undefined)
      profile.activeChannels = dto.activeChannels;
    if (dto.teamSize !== undefined) profile.teamSize = dto.teamSize;
  }
}
