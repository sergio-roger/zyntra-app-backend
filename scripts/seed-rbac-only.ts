import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { RbacSeeder } from '../src/database/seeds/02-rbac.seed';
import { SeedModule } from './seed.module';

async function bootstrap() {
  console.log('\n🚀 Running RbacSeeder only...\n');

  const app = await NestFactory.createApplicationContext(SeedModule);
  const ds = app.get(DataSource);

  try {
    await new RbacSeeder().run(ds);
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await app.close();
  }

  console.log('\n🎉 RbacSeeder finished!\n');
}

void bootstrap();
