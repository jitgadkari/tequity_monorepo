const { getMasterDb } = require('../lib/master-db');
const { decrypt } = require('@tequity/utils');

async function analyzeTenantConnection() {
    const db = getMasterDb();

    try {
        const tenant = await db.tenant.findUnique({
            where: { slug: 'testdataroom-f79dzl' },
            select: {
                slug: true,
                supabaseProjectId: true,
                supabaseProjectRef: true,
                databaseUrlEncrypted: true,
            }
        });

        if (!tenant) {
            console.log('❌ Tenant not found');
            return;
        }

        console.log('='.repeat(70));
        console.log('TENANT CONFIGURATION ANALYSIS');
        console.log('='.repeat(70));
        console.log();
        console.log('Tenant Slug:', tenant.slug);
        console.log('Supabase Project ID:', tenant.supabaseProjectId);
        console.log('Supabase Project Ref:', tenant.supabaseProjectRef);
        console.log();

        if (tenant.databaseUrlEncrypted) {
            console.log('-'.repeat(70));
            console.log('STORED DATABASE URL (DECRYPTED):');
            console.log('-'.repeat(70));

            const decrypted = decrypt(tenant.databaseUrlEncrypted);
            console.log(decrypted);
            console.log();

            // Parse URL components
            try {
                const url = new URL(decrypted);
                console.log('-'.repeat(70));
                console.log('URL COMPONENTS:');
                console.log('-'.repeat(70));
                console.log('Protocol:', url.protocol);
                console.log('Username:', url.username);
                console.log('Hostname:', url.hostname);
                console.log('Port:', url.port);
                console.log('Database Name:', url.pathname.substring(1));
                console.log('SSL Mode:', url.searchParams.get('sslmode') || 'not specified');
                console.log();

                // Check for mismatches
                console.log('-'.repeat(70));
                console.log('MISMATCH ANALYSIS:');
                console.log('-'.repeat(70));

                const expectedHost = `db.${tenant.supabaseProjectRef}.supabase.co`;
                const actualHost = url.hostname;

                if (actualHost !== expectedHost) {
                    console.log('⚠️  HOSTNAME MISMATCH DETECTED!');
                    console.log('   Expected:', expectedHost);
                    console.log('   Actual:  ', actualHost);
                } else {
                    console.log('✅ Hostname matches project ref');
                }

                if (url.port !== '5432' && url.port !== '6543') {
                    console.log('⚠️  UNUSUAL PORT:', url.port);
                } else {
                    console.log('✅ Port:', url.port, url.port === '6543' ? '(pooler)' : '(direct)');
                }

                console.log();
                console.log('-'.repeat(70));
                console.log('RECOMMENDATION:');
                console.log('-'.repeat(70));

                if (url.hostname.includes('pooler.supabase.com')) {
                    console.log('✅ Using connection pooler (good for serverless)');
                } else {
                    console.log('⚠️  Using direct connection');
                    console.log('   For Next.js, you should use the pooler URL:');
                    console.log('   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
                }

            } catch (urlError) {
                console.error('❌ Error parsing URL:', urlError.message);
            }
        } else {
            console.log('❌ No database URL stored');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await db.$disconnect();
    }
}

analyzeTenantConnection().catch(console.error);
