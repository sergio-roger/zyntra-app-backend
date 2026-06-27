import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { SeedModule } from './seed.module';
import { PlansSeeder } from '../src/database/seeds/01-plans.seed';
import { RbacSeeder } from '../src/database/seeds/02-rbac.seed';
import { CrmSeeder } from '../src/database/seeds/03-crm.seed';
import { Seeder } from '../src/database/seeds/seeder.interface';

async function bootstrap() {
  console.log('\n🚀 Starting Seed Process...\n');

  const app = await NestFactory.createApplicationContext(SeedModule);
  const ds = app.get(DataSource);

  const seeders: Seeder[] = [
    new PlansSeeder(),
    new RbacSeeder(),
    new CrmSeeder(),
  ];

  try {
    for (const seeder of seeders) {
      console.log(`\n⏳ Running ${seeder.constructor.name}...`);
      await seeder.run(ds);
      console.log(`✅ Finished ${seeder.constructor.name}`);
    }
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await app.close();
  }

  console.log('\n🎉 All seeders executed successfully!\n');
}

bootstrap();
