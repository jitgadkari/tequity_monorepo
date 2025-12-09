const crypto = require('crypto');

const ENCRYPTION_KEY = 'your-encryption-key-change-this-in-production-min-32-chars';

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

    return [
        salt.toString('hex'),
        iv.toString('hex'),
        tag.toString('hex'),
        encrypted,
    ].join(':');
}

// The CORRECT transaction pooler URL
const correctUrl = 'postgresql://postgres.dohmbmwteexexuxsemee:7QZlIoh7*LVPwPzE3S6udqcC@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';

console.log('='.repeat(70));
console.log('CORRECT TRANSACTION POOLER URL');
console.log('='.repeat(70));
console.log();
console.log('URL:', correctUrl);
console.log();

const encrypted = encrypt(correctUrl);
console.log('Encrypted:', encrypted);
console.log();
console.log('SQL UPDATE:');
console.log(`UPDATE tenants SET "databaseUrlEncrypted" = '${encrypted}' WHERE slug = 'testdataroom-f79dzl';`);
