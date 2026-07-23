import { DataSource } from 'typeorm';
import { Business } from '../../modules/auth/entities/business.entity';
import { BusinessProfile } from '../../modules/auth/entities/business-profile.entity';
import { Industry } from '../../modules/crm/entities/industry.entity';
import { BUSINESS_PROFILES_DATA } from './data/business-profiles.data';
import { Seeder } from './seeder.interface';

export class BusinessProfilesSeeder implements Seeder {
  async run(ds: DataSource): Promise<void> {
    const businessRepo = ds.getRepository(Business);
    const industryRepo = ds.getRepository(Industry);
    const profileRepo = ds.getRepository(BusinessProfile);

    console.log('\n🧭 Seeding business profiles...');

    for (const seed of BUSINESS_PROFILES_DATA) {
      const business = await businessRepo.findOne({
        where: { name: seed.businessName },
      });
      if (!business) {
        console.log(`  ⚠️  Business not found, skipped: ${seed.businessName}`);
        continue;
      }

      const industry = await industryRepo.findOne({
        where: { businessId: business.id, name: seed.industryName },
      });

      const existing = await profileRepo.findOne({
        where: { businessId: business.id },
      });

      const fields = {
        industryId: industry?.id ?? null,
        nicheDetail: seed.nicheDetail,
        valueProposition: seed.valueProposition,
        mission: seed.mission,
        competitors: seed.competitors,
        targetAudience: seed.targetAudience,
        audienceAgeRange: seed.audienceAgeRange,
        businessModel: seed.businessModel,
        geographicScope: seed.geographicScope,
        country: seed.country,
        city: seed.city,
        tone: seed.tone,
        brandVoiceNotes: seed.brandVoiceNotes,
        locale: seed.locale,
        brandColors: seed.brandColors,
        primaryGoal: seed.primaryGoal,
        monthlyBudgetRange: seed.monthlyBudgetRange,
        activeChannels: seed.activeChannels,
        teamSize: seed.teamSize,
      };

      if (existing) {
        await profileRepo.save({ ...existing, ...fields });
        console.log(`  🔄 Business profile updated: ${seed.businessName}`);
      } else {
        await profileRepo.save(
          profileRepo.create({ businessId: business.id, ...fields }),
        );
        console.log(`  ✅ Business profile created: ${seed.businessName}`);
      }
    }
  }
}
