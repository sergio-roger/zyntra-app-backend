import { Client } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SEED_PASSWORD = 'Zyntra2025!';
const ARGON2_HASH_LEN = 90; // argon2 hashes are ~95-97 chars; bcrypt is exactly 60

async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const pepper = Buffer.from(
    process.env.ARGON2_PEPPER || 'default-pepper-key-for-fallback-planchat',
  );

  const newHash = await argon2.hash(SEED_PASSWORD, { secret: pepper });
  console.log(`\n🔑 New argon2 hash length: ${newHash.length}`);

  // Fix businesses with bcrypt hashes (length < 90)
  console.log('\n🏢 Fixing businesses with bcrypt hashes...');
  const bizResult = await c.query(
    `SELECT id, email, length(password_hash) as hash_len FROM public.businesses WHERE length(password_hash) < $1`,
    [ARGON2_HASH_LEN],
  );
  console.log(`  Found ${bizResult.rows.length} business(es) to fix`);
  for (const row of bizResult.rows) {
    await c.query(
      `UPDATE public.businesses SET password_hash = $1 WHERE id = $2`,
      [newHash, row.id],
    );
    console.log(`  ✅ Fixed: ${row.email} (was ${row.hash_len} chars)`);
  }

  // Fix security.users with bcrypt hashes (length < 90)
  console.log('\n👥 Fixing security.users with bcrypt hashes...');
  const usersResult = await c.query(
    `SELECT id, email, length(password_hash) as hash_len FROM security.users WHERE length(password_hash) < $1`,
    [ARGON2_HASH_LEN],
  );
  console.log(`  Found ${usersResult.rows.length} user(s) to fix`);
  for (const row of usersResult.rows) {
    await c.query(
      `UPDATE security.users SET password_hash = $1 WHERE id = $2`,
      [newHash, row.id],
    );
    console.log(`  ✅ Fixed: ${row.email} (was ${row.hash_len} chars)`);
  }

  // Verify
  console.log('\n🔍 Verification (all hash lengths should be > 90):');
  const bizCheck = await c.query(
    `SELECT email, length(password_hash) as hash_len FROM public.businesses`,
  );
  bizCheck.rows.forEach((r) =>
    console.log(`  businesses: ${r.email} → ${r.hash_len} chars`),
  );

  const userCheck = await c.query(
    `SELECT email, length(password_hash) as hash_len FROM security.users`,
  );
  userCheck.rows.forEach((r) =>
    console.log(`  users:      ${r.email} → ${r.hash_len} chars`),
  );

  await c.end();
  console.log('\n✨ Password hashes fixed successfully!\n');
}

run().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
