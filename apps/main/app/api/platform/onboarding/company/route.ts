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

    const { companyName, industry, companySize, role } = await request.json();

    if (!companyName || !industry || !companySize || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const db = getMasterDb();

    // Update onboarding record
    const existingOnboarding = await db.query.tenantOnboarding.findFirst({
      where: eq(schema.tenantOnboarding.userId, session.userId),
    });

    if (existingOnboarding) {
      await db
        .update(schema.tenantOnboarding)
        .set({
          companyName,
          industry,
          companySize,
          role,
          companyInfoCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.tenantOnboarding.userId, session.userId));
    } else {
      await db.insert(schema.tenantOnboarding).values({
        userId: session.userId,
        companyName,
        industry,
        companySize,
        role,
        companyInfoCompleted: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Company info saved',
    });
  } catch (error) {
    console.error('Company onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to save company info' },
      { status: 500 }
    );
  }
}
