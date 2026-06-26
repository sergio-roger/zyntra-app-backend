import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  console.log('=== security.users columns ===');
  const cols = await c.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'security' AND table_name = 'users' ORDER BY ordinal_position`,
  );
  cols.rows.forEach((r) => console.log(' ', r.column_name, '|', r.data_type));

  console.log('\n=== public.businesses columns ===');
  const bcols = await c.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'businesses' ORDER BY ordinal_position`,
  );
  bcols.rows.forEach((r) => console.log(' ', r.column_name, '|', r.data_type));

  console.log('\n=== crm.contacts: owner_id exists? ===');
  const ccols = await c.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'crm' AND table_name = 'contacts' AND column_name = 'owner_id'`,
  );
  console.log(' owner_id exists:', ccols.rows.length > 0);

  console.log('\n=== Sample businesses (email, plan_id, plan_status, hash_len) ===');
  const biz = await c.query(
    `SELECT email, plan_id, plan_status, length(password_hash) as hash_len FROM public.businesses LIMIT 6`,
  );
  biz.rows.forEach((r) => console.log(' ', JSON.stringify(r)));

  console.log('\n=== Sample security.users (email, role, is_active, hash_len) ===');
  const users = await c.query(
    `SELECT email, role, is_active, length(password_hash) as hash_len FROM security.users LIMIT 10`,
  );
  users.rows.forEach((r) => console.log(' ', JSON.stringify(r)));

  await c.end();
}

run().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
