import { db } from './index';
import { customerPrompts } from './schema';

async function seedCustomerPrompts() {
  console.log('🌱 Seeding customer prompts...');

  try {
    const defaultPrompts = [
      // Decoding prompts
      {
        customerSlug: 'default',
        promptIdentifier: 'decoding:vendor-message',
        promptName: 'Vendor Message Decode',
        promptType: 'decoding' as const,
        promptText: `You are a textile industry expert. Decode and extract information from the vendor's message text below.

Extract and organize:
- Fabric specifications (width, weight, GSM)
- Pricing information
- Availability and lead times
- Minimum order quantities
- Any special terms or conditions

Vendor Message:
{extracted_text}

Output the information in a structured, easy-to-read format.`,
        description: 'Decodes vendor messages and extracts key information',
        isActive: true,
      },
      {
        customerSlug: 'default',
        promptIdentifier: 'decoding:customer-message',
        promptName: 'Customer Message Decode',
        promptType: 'decoding' as const,
        promptText: `You are a textile industry expert. Decode and extract the customer's requirements from their message.

Extract and organize:
- Product/Article code
- Quantity required
- Delivery timeline
- Quality requirements
- Budget constraints
- Any special requests

Customer Message:
{extracted_text}

Output a clear summary of the customer's requirements.`,
        description: 'Decodes customer messages and extracts requirements',
        isActive: true,
      },

      // Validating prompts
      {
        customerSlug: 'default',
        promptIdentifier: 'validating:customer-query',
        promptName: 'Customer Query Validation',
        promptType: 'validating' as const,
        promptText: `Validate the customer query for completeness and clarity.

Check if the query includes:
- Clear product/fabric specifications
- Quantity requirements
- Timeline expectations
- Contact information
- Budget or pricing expectations

Customer Query:
{extracted_text}

Respond with:
- ✅ Valid: If query is complete
- ⚠️  Needs clarification: List missing information
- ❌ Invalid: If query is unclear or incomplete`,
        description: 'Validates customer queries for completeness',
        isActive: true,
      },

      // Extracting prompts
      {
        customerSlug: 'default',
        promptIdentifier: 'extracting:fabric-specs',
        promptName: 'Fabric Specifications Extraction',
        promptType: 'extracting' as const,
        promptText: `Extract detailed fabric specifications from the text below.

Extract:
- Fabric Type (Cotton, Polyester, Blend, etc.)
- Width (in inches/cm)
- Weight/GSM
- Weft specifications (S/KG)
- Warp specifications (S/KG)
- Elasticity percentage
- Growth percentage
- Color/Pattern
- Finish/Treatment

Source Text:
{extracted_text}

Output in structured JSON format.`,
        description: 'Extracts fabric specifications into structured data',
        isActive: true,
      },

      // Generating prompts
      {
        customerSlug: 'default',
        promptIdentifier: 'generating:inquiry-response',
        promptName: 'Inquiry Response Generation',
        promptType: 'generating' as const,
        promptText: `Generate a professional response to the customer inquiry below.

Based on the inquiry, create a response that:
- Acknowledges their requirements
- Confirms product availability
- Provides pricing (if applicable)
- Mentions delivery timeline
- Requests any missing information
- Maintains professional tone

Customer Inquiry:
{extracted_text}

Generate a complete, professional response email.`,
        description: 'Generates professional responses to customer inquiries',
        isActive: true,
      },

      // Bifurcation prompts
      {
        customerSlug: 'default',
        promptIdentifier: 'bifurcation:ticket-routing',
        promptName: 'Ticket Routing',
        promptType: 'bifurcation' as const,
        promptText: `Analyze the message and determine the appropriate department for routing.

Departments:
- SALES: New inquiries, quotes, pricing
- SUPPORT: Existing orders, tracking, issues
- TECHNICAL: Product specifications, quality concerns
- ACCOUNTS: Payments, invoices, billing
- GENERAL: Other queries

Message:
{extracted_text}

Respond with:
Department: [DEPARTMENT_NAME]
Reason: [Brief explanation]
Priority: [HIGH/MEDIUM/LOW]`,
        description: 'Routes messages to appropriate departments',
        isActive: true,
      },
    ];

    // Insert all default prompts
    for (const prompt of defaultPrompts) {
      await db.insert(customerPrompts).values(prompt).onConflictDoNothing();
      console.log(`✅ Seeded: ${prompt.promptName}`);
    }

    console.log('✅ All default customer prompts seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding customer prompts:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedCustomerPrompts()
    .then(() => {
      console.log('✅ Customer prompts seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Customer prompts seeding failed:', error);
      process.exit(1);
    });
}

export { seedCustomerPrompts };
