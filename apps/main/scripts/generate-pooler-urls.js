const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY environment variable not set');
    process.exit(1);
}

function encrypt(text) {
    const ALGORITHM = 'aes-256-gcm';
    const IV_LENGTH = 16;
    const SALT_LENGTH = 32;

    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted data
    return [
        salt.toString('hex'),
        iv.toString('hex'),
        tag.toString('hex'),
        encrypted,
    ].join(':');
}

// Current URL (direct connection - doesn't work for serverless)
const currentUrl = 'postgresql://postgres:7QZlIoh7*LVPwPzE3S6udqcC@db.dohmbmwteexexuxsemee.supabase.co:5432/postgres';

// Extract password from current URL
const password = '7QZlIoh7*LVPwPzE3S6udqcC';
const projectRef = 'dohmbmwteexexuxsemee';

// Build the CORRECT pooler URL
// Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
// Note: We need to know the region. Common regions are: ap-southeast-1, us-east-1, eu-west-1

console.log('='.repeat(70));
console.log('DATABASE URL MIGRATION');
console.log('='.repeat(70));
console.log();
console.log('Current URL (DIRECT - NOT WORKING):');
console.log(currentUrl);
console.log();
console.log('Project Ref:', projectRef);
console.log('Password:', password);
console.log();
console.log('-'.repeat(70));
console.log('POSSIBLE POOLER URLS (try each region):');
console.log('-'.repeat(70));
console.log();

const regions = ['ap-southeast-1', 'us-east-1', 'eu-west-1', 'ap-south-1'];

regions.forEach((region, index) => {
    const poolerUrl = `postgresql://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    const encrypted = encrypt(poolerUrl);

    console.log(`${index + 1}. Region: ${region}`);
    console.log(`   URL: ${poolerUrl}`);
    console.log(`   Encrypted: ${encrypted}`);
    console.log();
});

console.log('-'.repeat(70));
console.log('INSTRUCTIONS:');
console.log('-'.repeat(70));
console.log('1. Check your Supabase project settings to find the correct region');
console.log('2. Copy the encrypted value for that region');
console.log('3. Run the SQL update command below with the correct encrypted value');
console.log();
console.log('SQL UPDATE COMMAND:');
console.log(`UPDATE tenants SET "databaseUrlEncrypted" = 'PASTE_ENCRYPTED_VALUE_HERE' WHERE slug = 'testdataroom-f79dzl';`);
console.log();
