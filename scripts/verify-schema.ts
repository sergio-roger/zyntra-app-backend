import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verify() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('\n🔍 Verifying schema and data...\n');

  // 1. Plans in public schema
  const plans = await client.query(`
    SELECT id, name, price, billing_cycle, is_popular, contact_limit
    FROM public.plans ORDER BY price
  `);
  console.log('📦 public.plans:');
  plans.rows.forEach(p =>
    console.log(`  • ${p.name} ($${p.price} ${p.billing_cycle}) - contacts: ${p.contact_limit}`)
  );

  // 2. Businesses in public schema with plan relation
  const businesses = await client.query(`
    SELECT b.name, b.email, p.name as plan_name, b.plan_status
    FROM public.businesses b
    LEFT JOIN public.plans p ON p.id = b.plan_id
    ORDER BY b.name
  `);
  console.log('\n🏢 public.businesses (with plan relation):');
  businesses.rows.forEach(b =>
    console.log(`  • ${b.name} [${b.email}] → plan: ${b.plan_name} (${b.plan_status})`)
  );

  // 3. Users in security schema with plan relation
  const users = await client.query(`
    SELECT u.name, u.email, u.role, p.name as plan_name
    FROM security.users u
    LEFT JOIN public.plans p ON p.id = u.plan_id
    ORDER BY u.name
  `);
  console.log('\n👤 security.users (with plan relation):');
  users.rows.forEach(u =>
    console.log(`  • ${u.name} [${u.email}] role: ${u.role} → plan: ${u.plan_name ?? 'none'}`)
  );

  // 4. Plan descriptions
  const descs = await client.query(`
    SELECT p.name as plan_name, COUNT(pd.id) as desc_count
    FROM public.plans p
    LEFT JOIN public.plan_descriptions pd ON pd.plan_id = p.id
    GROUP BY p.name ORDER BY p.name
  `);
  console.log('\n📝 public.plan_descriptions (count per plan):');
  descs.rows.forEach(d =>
    console.log(`  • ${d.plan_name}: ${d.desc_count} descriptions`)
  );

  // 5. Lifecycle stages
  const stages = await client.query(`
    SELECT b.name as business, COUNT(ls.id) as stage_count
    FROM public.businesses b
    LEFT JOIN public.lifecycle_stages ls ON ls.business_id = b.id
    GROUP BY b.name ORDER BY b.name
  `);
  console.log('\n🔄 public.lifecycle_stages (count per business):');
  stages.rows.forEach(s =>
    console.log(`  • ${s.business}: ${s.stage_count} stages`)
  );

  // 6. Contacts
  const contacts = await client.query(`
    SELECT b.name as business, COUNT(c.id) as contact_count
    FROM public.businesses b
    LEFT JOIN crm.contacts c ON c.business_id = b.id
    GROUP BY b.name ORDER BY b.name
  `);
  console.log('\n👥 crm.contacts (count per business):');
  contacts.rows.forEach(c =>
    console.log(`  • ${c.business}: ${c.contact_count} contacts`)
  );

  await client.end();
  console.log('\n✅ Verification complete.\n');
}

verify().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
