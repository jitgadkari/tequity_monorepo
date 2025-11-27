import { db } from '../lib/db';
import { customerPrompts } from '../lib/db/schema';

async function checkPrompts() {
  console.log('🔍 Checking customer prompts in database...\n');

  try {
    const allPrompts = await db.select().from(customerPrompts);

    console.log(`📊 Total prompts in database: ${allPrompts.length}\n`);

    if (allPrompts.length === 0) {
      console.log('❌ No prompts found in database!');
      console.log('   You need to create prompts via the UI at http://localhost:3000/customer-prompts');
      return;
    }

    // Group by customer slug
    const byCustomer = allPrompts.reduce((acc, prompt) => {
      if (!acc[prompt.customerSlug]) {
        acc[prompt.customerSlug] = [];
      }
      acc[prompt.customerSlug].push(prompt);
      return acc;
    }, {} as Record<string, typeof allPrompts>);

    // Display by customer
    for (const [customerSlug, prompts] of Object.entries(byCustomer)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Customer: ${customerSlug}`);
      console.log(`${'='.repeat(60)}`);

      prompts.forEach((prompt, idx) => {
        console.log(`\n${idx + 1}. ${prompt.promptName}`);
        console.log(`   Identifier: ${prompt.promptIdentifier}`);
        console.log(`   Type: ${prompt.promptType}`);
        console.log(`   Active: ${prompt.isActive}`);
        console.log(`   Description: ${prompt.description || 'N/A'}`);
      });
    }

    console.log(`\n${'='.repeat(60)}\n`);

    // Check for the specific prompt being requested
    const targetPrompt = allPrompts.find(
      p => p.promptIdentifier === 'extracting:extract_text_from_image' ||
           p.promptIdentifier === 'extracting:extract-text-from-image'
    );

    if (targetPrompt) {
      console.log('✅ Found the requested prompt:');
      console.log(`   Customer: ${targetPrompt.customerSlug}`);
      console.log(`   Identifier: ${targetPrompt.promptIdentifier}`);
    } else {
      console.log('❌ The prompt "extracting:extract_text_from_image" does NOT exist');
      console.log('   You need to create it via the UI:');
      console.log('   1. Go to http://localhost:3000/customer-prompts');
      console.log('   2. Click "Default Prompts Library" tab');
      console.log('   3. Click "Add Default Prompt"');
      console.log('   4. Fill in:');
      console.log('      - Prompt Name: Extract Text From Image');
      console.log('      - Prompt Type: extracting');
      console.log('      - Prompt Text: [Your extraction prompt]');
    }

  } catch (error) {
    console.error('❌ Error checking prompts:', error);
  }

  process.exit(0);
}

checkPrompts();
