import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, '../src/database/migrations');

const FILES = [
  '20260721_create_system_agents.sql',
  '20260721_add_status_to_system_agents.sql',
  '20260721_create_agent_categories.sql',
  '20260721_add_category_and_stats_to_system_agents.sql',
  '20260721_create_business_system_agents.sql',
  '20260723_add_tools_to_system_agents.sql',
  '20260724_add_identity_to_system_agents.sql',
];

async function bootstrap() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('\n🌱 Re-applying system agents catalog migrations...\n');

  for (const file of FILES) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    await client.query(sql);
    console.log(`  ✅ Applied: ${file}`);
  }

  await client.end();
  console.log('\n✅ System agents catalog restored.\n');
}

bootstrap().catch((err) => {
  console.error('\n❌ Failed:', err);
  process.exit(1);
});
