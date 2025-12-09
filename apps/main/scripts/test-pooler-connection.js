// Test the new pooler connection
const { Client } = require('pg');

const poolerUrl = 'postgresql://postgres.dohmbmwteexexuxsemee:7QZlIoh7*LVPwPzE3S6udqcC@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function testConnection() {
    console.log('='.repeat(70));
    console.log('TESTING POOLER CONNECTION');
    console.log('='.repeat(70));
    console.log();
    console.log('Connecting to:', poolerUrl.replace(/:[^:@]+@/, ':****@'));
    console.log();

    const client = new Client({
        connectionString: poolerUrl,
        connectionTimeoutMillis: 5000,
    });

    try {
        console.log('Attempting to connect...');
        await client.connect();
        console.log('✅ Connection successful!');
        console.log();

        // Test a simple query
        console.log('Running test query: SELECT version()');
        const result = await client.query('SELECT version()');
        console.log('✅ Query successful!');
        console.log('PostgreSQL version:', result.rows[0].version.split(' ')[0], result.rows[0].version.split(' ')[1]);
        console.log();

        // Test another query
        console.log('Running test query: SELECT current_database()');
        const dbResult = await client.query('SELECT current_database()');
        console.log('✅ Connected to database:', dbResult.rows[0].current_database);
        console.log();

        console.log('='.repeat(70));
        console.log('✅ ALL TESTS PASSED - POOLER CONNECTION WORKING!');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error();
        console.error('Error details:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

testConnection();
