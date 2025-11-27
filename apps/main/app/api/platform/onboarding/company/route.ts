import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyName } = body;

    // Only companyName is required (dataroom name)
    if (!companyName) {
      return NextResponse.json(
        { error: 'Dataroom name is required' },
        { status: 400 }
      );
    }

    const db = getMasterDb();

    // Store company data as JSON
    const companyData = {
      companyName,
      ...body, // Include any additional fields
    };

    // Update or create onboarding record
    const existingOnboarding = await db.query.tenantOnboarding.findFirst({
      where: eq(schema.tenantOnboarding.userId, session.userId),
    });

    if (existingOnboarding) {
      await db
        .update(schema.tenantOnboarding)
        .set({
          companyData,
          companyInfoCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.tenantOnboarding.userId, session.userId));
    } else {
      await db.insert(schema.tenantOnboarding).values({
        userId: session.userId,
        companyData,
        companyInfoCompleted: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Dataroom name saved',
    });
  } catch (error) {
    console.error('Company onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to save dataroom name' },
      { status: 500 }
    );
  }
}
