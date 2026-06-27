import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function bootstrap() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('\n🗑️  Resetting database (dropping all tables)...\n');

  // Use CASCADE to handle all FK dependencies in one shot
  const drops = [
    'crm.deal_stage_history',
    'crm.activities',
    'crm.contact_tags',
    'crm.company_tags',
    'crm.contacts',
    'crm.deals',
    'crm.companies',
    'crm.sector_types',
    'crm.tasks',
    'crm.custom_fields',
    'crm.tags',
    'crm.segments',
    'crm.pipeline_stages',
    'crm.pipelines',
    '"security"."user_teams_team"',
    '"security"."team_members"',
    '"security"."users"',
    '"security"."teams"',
    '"security"."permissions"',
    '"security"."menus"',
    '"security"."roles"',
    'public.lifecycle_history',
    'public.lifecycle_stages',
    'public.chatbot_configs',
    'public.plan_descriptions',
    'public.plan_modules',
    'public.businesses',
    'public.plans',
  ];

  for (const table of drops) {
    await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    console.log(`  🗑  Dropped: ${table}`);
  }

  await client.end();
  console.log(
    '\n✅ All tables dropped. TypeORM will recreate them on next start.\n',
  );
}

bootstrap().catch((err) => {
  console.error('\n❌ Reset failed:', err);
  process.exit(1);
});
