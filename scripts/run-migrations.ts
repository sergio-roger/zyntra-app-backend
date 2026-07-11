import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigration(c: Client, filename: string) {
  const sql = fs.readFileSync(
    path.join(__dirname, '../src/database/migrations', filename),
    'utf8',
  );
  console.log(`\n>>> Running: ${filename}`);
  try {
    await c.query(sql);
    console.log(`    ✅ Success`);
  } catch (e: any) {
    if (
      e.code === '42710' ||
      e.code === '23505' ||
      e.message.includes('already exists')
    ) {
      console.log(`    ℹ️  Skipped (already exists)`);
    } else {
      console.log(`    ❌ Error: ${e.message}`);
    }
  }
}

async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  console.log('Connected to database!');

  // Run migrations in order
  await runMigration(c, '20260625_add_owner_to_contacts.sql');
  await runMigration(c, '20260626_remove_stage_from_contacts.sql');
  await runMigration(c, '20260626_drop_company_name_from_contacts.sql');
  await runMigration(c, '20260626_add_empresas.sql');
  await runMigration(c, '20260627_create_user_preferences.sql');
  await runMigration(c, '20260627_update_companies.sql');
  await runMigration(c, '20260629_update_users_schema.sql');
  await runMigration(c, '20260701_create_channels.sql');
  await runMigration(c, '20260702_add_profile_fields_to_businesses.sql');
  await runMigration(c, '20260703_add_company_fields_to_businesses.sql');
  await runMigration(c, '20260704_add_profile_fields_to_users.sql');
  await runMigration(c, '20260704_add_avatar_file_id_to_users.sql');
  await runMigration(c, '20260704_document_channels_multi_web_support.sql');
  await runMigration(c, '20260709_add_widget_public_key_auth.sql');
  await runMigration(c, '20260710_add_blocked_and_insecure_origins.sql');
  await runMigration(c, '20260710_create_messaging_schema.sql');
  await runMigration(c, '20260711_update_messaging_conversations.sql');
  await runMigration(c, '20260711_add_deleted_at_to_channels.sql');
  await runMigration(c, '20260711_make_channels_unique_partial.sql');
  await runMigration(c, '20260711_create_settings.sql');

  console.log('\n✅ All migrations completed!');
  await c.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
