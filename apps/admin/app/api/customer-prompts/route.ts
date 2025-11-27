import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerPrompts, customers } from '@/lib/db/schema';
import { eq, and, asc, ne } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

/**
 * Copies a default prompt to all active customers
 * This is called when a default prompt is created or updated
 */
async function copyDefaultPromptToAllCustomers(
  promptIdentifier: string,
  promptName: string,
  promptType: string,
  promptText: string,
  description: string | null,
  isActive: boolean
) {
  try {
    // Get all active customers (excluding 'default')
    const allCustomers = await db
      .select({ slug: customers.slug })
      .from(customers)
      .where(eq(customers.status, 'active'));

    console.log(`[Copy Default] Copying prompt "${promptIdentifier}" to ${allCustomers.length} customers`);

    // Copy to each customer (only if they don't already have a custom version)
    for (const customer of allCustomers) {
      // Check if customer already has this prompt
      const existing = await db
        .select()
        .from(customerPrompts)
        .where(
          and(
            eq(customerPrompts.customerSlug, customer.slug),
            eq(customerPrompts.promptIdentifier, promptIdentifier)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        // Customer doesn't have this prompt yet, create it
        await db.insert(customerPrompts).values({
          customerSlug: customer.slug,
          promptIdentifier,
          promptName,
          promptType: promptType as any,
          promptText,
          description: description || `Copied from default: ${promptName}`,
          isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`[Copy Default] ✅ Created for ${customer.slug}`);
      } else {
        console.log(`[Copy Default] ⏭️  ${customer.slug} already has custom version, skipping`);
      }
    }

    return allCustomers.length;
  } catch (error) {
    console.error('[Copy Default] Error copying prompt to customers:', error);
    throw error;
  }
}

// GET /api/customer-prompts - List all customer prompts with optional filtering
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const customerSlug = searchParams.get('customer_slug');
    const promptType = searchParams.get('prompt_type');

    let query = db.select().from(customerPrompts);

    // Apply filters if provided
    const conditions = [];
    if (customerSlug) {
      conditions.push(eq(customerPrompts.customerSlug, customerSlug));
    }
    if (promptType) {
      conditions.push(eq(customerPrompts.promptType, promptType as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const prompts = await query.orderBy(
      asc(customerPrompts.customerSlug),
      asc(customerPrompts.promptType)
    );

    return NextResponse.json({
      success: true,
      prompts,
    });
  } catch (error) {
    console.error('Error fetching customer prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

// POST /api/customer-prompts - Create or update customer prompt
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    const body = await request.json();
    const {
      customer_slug,
      prompt_name,
      prompt_type,
      prompt_text,
      description,
      is_active,
    } = body;

    // Validation
    if (!customer_slug || !prompt_name || !prompt_type || !prompt_text) {
      return NextResponse.json(
        { error: 'customer_slug, prompt_name, prompt_type, and prompt_text are required' },
        { status: 400 }
      );
    }

    // Validate prompt_type
    const validPromptTypes = ['decoding', 'validating', 'extracting', 'generating', 'bifurcation', 'custom'];
    if (!validPromptTypes.includes(prompt_type)) {
      return NextResponse.json(
        { error: `Invalid prompt_type. Must be one of: ${validPromptTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Build prompt_identifier (format: "type:slugified-name")
    const slugifiedName = prompt_name
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '')  // Keep underscores for now
      .replace(/[\s_]+/g, '-')         // Convert spaces and underscores to dashes
      .replace(/-+/g, '-')             // Collapse multiple dashes
      .trim();
    const promptIdentifier = `${prompt_type}:${slugifiedName}`;

    // Enforce: Default must exist before customer-specific can be created
    if (customer_slug !== 'default') {
      const defaultExists = await db
        .select()
        .from(customerPrompts)
        .where(
          and(
            eq(customerPrompts.customerSlug, 'default'),
            eq(customerPrompts.promptIdentifier, promptIdentifier)
          )
        )
        .limit(1);

      if (defaultExists.length === 0) {
        return NextResponse.json(
          {
            error: 'Default prompt required',
            message: `You must create a default prompt for "${promptIdentifier}" before creating customer-specific versions. Please go to Default Prompts and create it first.`,
            promptIdentifier,
          },
          { status: 400 }
        );
      }
    }

    // Upsert (insert or update)
    const result = await db
      .insert(customerPrompts)
      .values({
        customerSlug: customer_slug,
        promptIdentifier,
        promptName: prompt_name,
        promptType: prompt_type,
        promptText: prompt_text,
        description: description || null,
        isActive: is_active !== undefined ? is_active : true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [customerPrompts.customerSlug, customerPrompts.promptIdentifier],
        set: {
          promptName: prompt_name,
          promptType: prompt_type,
          promptText: prompt_text,
          description: description || null,
          isActive: is_active !== undefined ? is_active : true,
          updatedAt: new Date(),
        },
      })
      .returning();

    // If this is a default prompt, automatically copy it to all customers
    if (customer_slug === 'default') {
      console.log(`[Default Prompt] Detected default prompt creation/update: ${promptIdentifier}`);
      try {
        const copiedCount = await copyDefaultPromptToAllCustomers(
          promptIdentifier,
          prompt_name,
          prompt_type,
          prompt_text,
          description || null,
          is_active !== undefined ? is_active : true
        );
        console.log(`[Default Prompt] ✅ Copied to ${copiedCount} customers`);
      } catch (error) {
        console.error('[Default Prompt] ⚠️  Error copying to customers:', error);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      prompt: result[0],
      message: `Prompt "${promptIdentifier}" saved successfully for ${customer_slug}`,
    });
  } catch (error) {
    console.error('Error saving customer prompt:', error);
    return NextResponse.json(
      { error: 'Failed to save prompt' },
      { status: 500 }
    );
  }
}

// DELETE /api/customer-prompts?id=xxx - Delete a customer prompt
export async function DELETE(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      );
    }

    await db.delete(customerPrompts).where(eq(customerPrompts.id, id));

    return NextResponse.json({
      success: true,
      message: 'Prompt deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting customer prompt:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}
