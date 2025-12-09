// Simple decryption script using the utils package
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY environment variable not set');
    process.exit(1);
}

function decrypt(encryptedData) {
    const [saltHex, ivHex, authTagHex, encryptedHex] = encryptedData.split(':');

    if (!saltHex || !ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

const encryptedUrl = process.argv[2];

if (!encryptedUrl) {
    console.error('Usage: node decrypt-url.js <encrypted_string>');
    process.exit(1);
}

try {
    const decrypted = decrypt(encryptedUrl);
    console.log('='.repeat(70));
    console.log('DECRYPTED DATABASE URL:');
    console.log('='.repeat(70));
    console.log(decrypted);
    console.log();

    // Parse and analyze
    const url = new URL(decrypted);
    console.log('-'.repeat(70));
    console.log('URL COMPONENTS:');
    console.log('-'.repeat(70));
    console.log('Protocol:', url.protocol);
    console.log('Username:', url.username);
    console.log('Hostname:', url.hostname);
    console.log('Port:', url.port);
    console.log('Database:', url.pathname.substring(1));
    console.log('SSL Mode:', url.searchParams.get('sslmode') || 'not specified');
    console.log();

    // Check for issues
    console.log('-'.repeat(70));
    console.log('ANALYSIS:');
    console.log('-'.repeat(70));

    if (url.hostname.includes('pooler.supabase.com')) {
        console.log('✅ Using connection pooler');
    } else if (url.hostname.includes('.supabase.co')) {
        console.log('⚠️  Using direct connection (not pooler)');
        console.log('   Hostname:', url.hostname);
    } else {
        console.log('❓ Unknown connection type');
    }

    if (url.port === '6543') {
        console.log('✅ Port 6543 (pooler)');
    } else if (url.port === '5432') {
        console.log('⚠️  Port 5432 (direct connection)');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
