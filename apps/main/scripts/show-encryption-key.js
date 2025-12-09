#!/usr/bin/env node

/**
 * Script to display the current ENCRYPTION_KEY being used
 * This helps verify which encryption key is configured
 */

require('dotenv').config({ path: '.env.local' });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

console.log('========================================');
console.log('ENCRYPTION KEY INFORMATION');
console.log('========================================');

if (!ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY environment variable is NOT set');
    console.log('\nPlease ensure you have ENCRYPTION_KEY defined in your .env.local file');
    console.log('The key should be at least 32 characters long for security');
    console.log('\nExample:');
    console.log('ENCRYPTION_KEY="your-encryption-key-change-this-in-production-min-32-chars"');
    process.exit(1);
}

console.log('✓ ENCRYPTION_KEY is set');
console.log(`\nKey Length: ${ENCRYPTION_KEY.length} characters`);
console.log(`\nYour ENCRYPTION_KEY is:`);
console.log('----------------------------------------');
console.log(ENCRYPTION_KEY);
console.log('----------------------------------------');

console.log('\n⚠️  IMPORTANT: Keep this key secure!');
console.log('- Store it safely (password manager, secrets vault)');
console.log('- Use the same key across all environments for the same tenant databases');
console.log('- If you lose this key, you cannot decrypt existing database URLs');
console.log('========================================');
