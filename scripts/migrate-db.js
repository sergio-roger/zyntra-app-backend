const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Connecting to:', connectionString);
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Ensure channel_id column exists in crm.contacts
    await client.query(`
      ALTER TABLE crm.contacts 
      ADD COLUMN IF NOT EXISTS channel_id UUID;
    `);
    console.log('Ensured channel_id column exists on crm.contacts');

    const distinctRes = await client.query(`
      SELECT DISTINCT source::text FROM crm.contacts
    `);
    console.log('Distinct source values in DB:', distinctRes.rows.map(r => r.source));

    // 1. Fetch all contacts with source = 'chatbot'
    const contactsRes = await client.query(`
      SELECT id, business_id, name, email, phone, source 
      FROM crm.contacts 
      WHERE source::text = 'chatbot'
    `);
    
    console.log(`Found ${contactsRes.rows.length} contacts with source='chatbot'`);

    for (const contact of contactsRes.rows) {
      console.log(`Processing contact: ${contact.name} (${contact.id}) for business ${contact.business_id}`);
      
      // Find the web_chat channel for this business
      const channelRes = await client.query(`
        SELECT c.id 
        FROM public.channels c
        JOIN public.channel_types ct ON c.channel_type_id = ct.id
        WHERE c.business_id = $1 AND ct.key = 'web_chat'
        LIMIT 1
      `, [contact.business_id]);

      let channelId = null;
      if (channelRes.rows.length > 0) {
        channelId = channelRes.rows[0].id;
        console.log(`  Found web_chat channel ${channelId} for business ${contact.business_id}`);
      } else {
        console.log(`  Warning: No web_chat channel found for business ${contact.business_id}`);
      }

      // Update the contact's source to 'web_chat' and set channel_id
      await client.query(`
        UPDATE crm.contacts 
        SET source = 'web_chat', channel_id = $1 
        WHERE id = $2
      `, [channelId, contact.id]);
      
      console.log(`  Updated contact ${contact.id} source to 'web_chat' and channel_id to ${channelId}`);
    }

    console.log('Migration complete.');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await client.end();
  }
}

run();
