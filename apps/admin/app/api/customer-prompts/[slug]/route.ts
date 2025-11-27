import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerPrompts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateServiceApiKey } from '@/lib/auth';

// GET /api/customer-prompts/[slug]?type=decoding&name=vendor-message
// Get specific customer's prompt by type and name
// This endpoint supports service-to-service authentication for customer applications
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    // Validate service API key for customer applications
    const isServiceCall = validateServiceApiKey(request);

    if (!isServiceCall) {
      return NextResponse.json(
        { error: 'Unauthorized. Service API key required.' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const promptType = searchParams.get('type');
    const promptName = searchParams.get('name');

    // Validate required parameters
    if (!promptType || !promptName) {
      return NextResponse.json(
        { error: 'Both "type" and "name" parameters are required. Example: ?type=decoding&name=vendor-message' },
        { status: 400 }
      );
    }

    // Validate prompt_type
    const validPromptTypes = ['decoding', 'validating', 'extracting', 'generating', 'bifurcation', 'custom'];
    if (!validPromptTypes.includes(promptType)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validPromptTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Build prompt identifier (format: "type:name")
    const promptIdentifier = `${promptType}:${promptName}`;

    console.log(`[Customer API] Fetching prompt for ${slug}: ${promptIdentifier}`);

    // Try to get customer-specific prompt first
    let result = await db
      .select()
      .from(customerPrompts)
      .where(
        and(
          eq(customerPrompts.customerSlug, slug),
          eq(customerPrompts.promptIdentifier, promptIdentifier),
          eq(customerPrompts.isActive, true)
        )
      )
      .limit(1);

    // If not found, get default prompt
    if (result.length === 0) {
      console.log(`[Customer API] No custom prompt found for ${slug}, using default: ${promptIdentifier}`);
      result = await db
        .select()
        .from(customerPrompts)
        .where(
          and(
            eq(customerPrompts.customerSlug, 'default'),
            eq(customerPrompts.promptIdentifier, promptIdentifier),
            eq(customerPrompts.isActive, true)
          )
        )
        .limit(1);
    }

    if (result.length === 0) {
      return NextResponse.json(
        {
          error: 'No prompt found',
          message: `Prompt "${promptIdentifier}" not found for customer "${slug}" or in defaults. Please ensure a default prompt exists first.`,
          promptIdentifier,
          customerSlug: slug
        },
        { status: 404 }
      );
    }

    const foundPrompt = result[0];
    const isUsingDefault = foundPrompt.customerSlug === 'default';

    console.log(`[Customer API] ✅ Returning ${isUsingDefault ? 'default' : 'custom'} prompt: ${promptIdentifier}`);

    return NextResponse.json({
      success: true,
      prompt: foundPrompt,
      isUsingDefault, // Indicates if using default or customer-specific
    });
  } catch (error) {
    console.error('Error fetching customer prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}
