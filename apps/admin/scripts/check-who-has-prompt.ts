import { db } from '../lib/db';
import { customerPrompts, customers } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkWhoHasPrompt() {
  const identifier = 'extracting:extract-text-from-image';

  console.log(`\n🔍 Checking who has prompt: "${identifier}"\n`);

  try {
    // Get all prompts with this identifier
    const prompts = await db
      .select()
      .from(customerPrompts)
      .where(eq(customerPrompts.promptIdentifier, identifier));

    console.log(`📊 Found ${prompts.length} total copies:\n`);

    prompts.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.customerSlug}`);
      console.log(`   Description: ${p.description || 'N/A'}`);
      console.log(`   Created: ${p.createdAt}`);
      console.log('');
    });

    // Check all customers
    console.log('\n👥 Checking all customers:\n');
    const allCustomers = await db.select().from(customers);

    console.log(`Total customers in DB: ${allCustomers.length}\n`);
    allCustomers.forEach(c => {
      const hasPrompt = prompts.some(p => p.customerSlug === c.slug);
      console.log(`${hasPrompt ? '✅' : '❌'} ${c.slug} (${c.name}) - Status: ${c.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

checkWhoHasPrompt();
