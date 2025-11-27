# Customer Prompts Management System

## Overview

The Customer Prompts Management System allows platform admins to configure multiple AI prompts per category for each customer. Customers can have custom versions of default prompts, ensuring consistency while allowing customization.

## Key Features

✅ **Multiple prompts per type** - Each type (decoding, validating, etc.) can have multiple named prompts
✅ **Mandatory defaults** - Customer-specific prompts require defaults to exist first
✅ **Side-by-side editing** - Compare default and custom prompts when editing
✅ **Prompt inheritance** - Customers automatically use defaults unless overridden
✅ **Type + Name identification** - Prompts identified by `type:name` (e.g., `decoding:vendor-message`)

---

## Architecture

### Prompt Identification

Each prompt is uniquely identified by:
- **Type**: Category (decoding, validating, extracting, generating, bifurcation, custom)
- **Name**: Specific identifier (e.g., "vendor-message", "customer-query")
- **Identifier**: Auto-generated as `type:slugified-name` (e.g., `decoding:vendor-message`)

### Example Prompts

```
decoding:vendor-message          → Decode vendor messages
decoding:customer-message        → Decode customer messages
validating:customer-query        → Validate customer queries
validating:vendor-response       → Validate vendor responses
extracting:fabric-specs          → Extract fabric specifications
generating:inquiry-response      → Generate inquiry responses
bifurcation:ticket-routing       → Route tickets to departments
```

---

## Database Schema

```sql
CREATE TABLE customer_prompts (
  id UUID PRIMARY KEY,
  customer_slug VARCHAR(255) NOT NULL,
  prompt_identifier VARCHAR(255) NOT NULL,  -- Format: "type:name"
  prompt_name VARCHAR(255) NOT NULL,        -- Human-readable name
  prompt_type VARCHAR(50) NOT NULL,         -- Type category
  prompt_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  UNIQUE(customer_slug, prompt_identifier)  -- Allows multiple prompts of same type
);
```

---

## Platform Admin Usage

### Two-Tab Interface

#### 1. Default Prompts Library Tab
Manage prompts that are available to ALL customers:

- **View by type**: Prompts grouped into Decoding, Validating, Extracting, etc.
- **Add defaults**: Create new default prompts that all customers can use
- **Edit/Delete**: Modify or remove default prompts
- **Status indicators**: See which types have prompts configured

#### 2. Customer Prompts Tab
Manage customer-specific overrides:

- **Select customer**: Choose which customer to manage
- **View defaults**: See all available default prompts
- **Status**: 🔵 Using Default | 🟢 Customized
- **Customize**: Override default with customer-specific version
- **Side-by-side editing**: Compare default and custom when editing

### Workflow Example

**Step 1: Create Default Prompts**
```
1. Go to "Default Prompts Library" tab
2. Click "Add Default Prompt"
3. Fill in:
   - Prompt Name: "Vendor Message Decode"
   - Type: Decoding
   - Prompt Text: [Your AI prompt with {extracted_text} placeholder]
4. Save
```

**Step 2: Customize for Specific Customer**
```
1. Go to "Customer Prompts" tab
2. Select customer (e.g., "ACME Corp")
3. Find "Vendor Message Decode" (shows 🔵 Using Default)
4. Click "Customize"
5. Edit prompt text (default text is pre-filled)
6. Save (now shows 🟢 Customized)
```

---

## Customer Application Integration

### API Endpoint

```
GET /api/customer-prompts/[slug]?type=decoding&name=vendor-message
```

**Headers:**
```
x-service-api-key: your-service-api-key
```

**Response:**
```json
{
  "success": true,
  "prompt": {
    "id": "uuid",
    "customerSlug": "acme-corp",
    "promptIdentifier": "decoding:vendor-message",
    "promptName": "Vendor Message Decode",
    "promptType": "decoding",
    "promptText": "Your custom prompt text with {extracted_text}",
    "isActive": true
  },
  "isUsingDefault": false  // true if using default, false if customized
}
```

### Usage Example

```typescript
// In customer application (e.g., WeaveDesk)

async function fetchPrompt(type: string, name: string) {
  const PLATFORM_URL = process.env.PLATFORM_API_URL;
  const CUSTOMER_SLUG = process.env.CUSTOMER_SLUG; // e.g., "acme-corp"
  const API_KEY = process.env.SERVICE_API_KEY;

  const response = await fetch(
    `${PLATFORM_URL}/api/customer-prompts/${CUSTOMER_SLUG}?type=${type}&name=${name}`,
    {
      headers: {
        'x-service-api-key': API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch prompt');
  }

  const data = await response.json();
  return data.prompt.promptText;
}

// Example 1: Decode vendor message
async function decodeVendorMessage(extractedText: string) {
  const promptTemplate = await fetchPrompt('decoding', 'vendor-message');
  const finalPrompt = promptTemplate.replace('{extracted_text}', extractedText);

  // Send to AI model
  const result = await aiModel.generate(finalPrompt);
  return result;
}

// Example 2: Validate customer query
async function validateCustomerQuery(query: string) {
  const promptTemplate = await fetchPrompt('validating', 'customer-query');
  const finalPrompt = promptTemplate.replace('{extracted_text}', query);

  const result = await aiModel.generate(finalPrompt);
  return result;
}

// Example 3: Extract fabric specifications
async function extractFabricSpecs(text: string) {
  const promptTemplate = await fetchPrompt('extracting', 'fabric-specs');
  const finalPrompt = promptTemplate.replace('{extracted_text}', text);

  const result = await aiModel.generate(finalPrompt);
  return JSON.parse(result); // Returns structured data
}
```

---

## Seeding Default Prompts

Run the seed script to create example default prompts:

```bash
npx tsx lib/db/seed-customer-prompts.ts
```

This creates 6 default prompts:
1. **decoding:vendor-message** - Decode vendor messages
2. **decoding:customer-message** - Decode customer messages
3. **validating:customer-query** - Validate customer queries
4. **extracting:fabric-specs** - Extract fabric specifications
5. **generating:inquiry-response** - Generate inquiry responses
6. **bifurcation:ticket-routing** - Route tickets to departments

---

## Enforcement Rules

### ✅ What's Enforced

1. **Default must exist first**
   - Cannot create customer-specific prompt without default
   - Error message guides admin to create default first

2. **Unique identifiers**
   - One prompt per identifier per customer
   - Can't have duplicate `decoding:vendor-message` for same customer

3. **Service API key required**
   - Customer applications must authenticate with API key
   - Prevents unauthorized access

### ❌ What Happens Without Defaults

If customer application requests a prompt that doesn't exist:

```json
{
  "error": "No prompt found",
  "message": "Prompt 'decoding:vendor-message' not found for customer 'acme-corp' or in defaults. Please ensure a default prompt exists first.",
  "promptIdentifier": "decoding:vendor-message",
  "customerSlug": "acme-corp"
}
```

**Solution**: Admin must create default prompt first.

---

## Best Practices

### For Platform Admins

1. **Create comprehensive defaults**
   - Cover all common use cases
   - Write clear, general-purpose prompts
   - Test prompts before deploying

2. **Name prompts clearly**
   - Use descriptive names (e.g., "Vendor Message Decode" not "Decode1")
   - Follow consistent naming convention
   - Add helpful descriptions

3. **Group by type logically**
   - Decoding: Text extraction and interpretation
   - Validating: Completeness and accuracy checks
   - Extracting: Structured data extraction
   - Generating: Content creation
   - Bifurcation: Decision making and routing

### For Customer Applications

1. **Cache prompts**
   - Fetch once and reuse
   - Refresh periodically or on-demand

2. **Handle fallbacks**
   - Always check `isUsingDefault` flag
   - Log when using defaults vs custom
   - Handle 404 errors gracefully

3. **Use descriptive names**
   - Makes code readable: `fetchPrompt('decoding', 'vendor-message')`
   - Self-documenting API calls

---

## Environment Variables

### Platform Application (.env.local)

```env
# Database
DATABASE_URL=postgresql://...

# Service API Key
SERVICE_API_KEY=generate-a-secure-key-here
```

### Customer Application (.env.local)

```env
# Platform API URL
PLATFORM_API_URL=https://platform.example.com

# Customer Identification
CUSTOMER_SLUG=acme-corp

# Service API Key (must match platform)
SERVICE_API_KEY=same-key-as-platform
```

---

## API Reference

### Admin Endpoints (Require Admin Auth)

#### GET /api/customer-prompts
List all prompts with optional filtering.

**Query Parameters:**
- `customer_slug` (optional)
- `prompt_type` (optional)

#### POST /api/customer-prompts
Create or update a prompt.

**Body:**
```json
{
  "customer_slug": "acme-corp",
  "prompt_name": "Vendor Message Decode",
  "prompt_type": "decoding",
  "prompt_text": "Your prompt...",
  "description": "Optional",
  "is_active": true
}
```

**Validation:**
- Checks if default exists (if customer_slug != 'default')
- Auto-generates `prompt_identifier` from type:slugified-name

#### DELETE /api/customer-prompts?id=xxx
Delete a prompt.

### Customer Endpoints (Require Service API Key)

#### GET /api/customer-prompts/[slug]?type=xxx&name=xxx
Fetch a specific prompt.

**Required Parameters:**
- `type`: Prompt type (decoding, validating, etc.)
- `name`: Prompt name (vendor-message, customer-query, etc.)

**Returns:**
- Customer-specific prompt if exists
- Default prompt if customer-specific doesn't exist
- 404 if neither exists

---

## Troubleshooting

### "Default prompt required" error

**Problem**: Trying to create customer-specific prompt without default.

**Solution**:
1. Go to "Default Prompts Library" tab
2. Create the default prompt first
3. Then create customer-specific version

### Prompt not found (404)

**Problem**: Customer application can't find prompt.

**Causes:**
1. Default prompt doesn't exist
2. Wrong type/name combination
3. Prompt is inactive

**Solution**:
1. Check default prompts exist in platform
2. Verify type and name match exactly
3. Ensure prompt is active

### Service API key issues

**Problem**: "Unauthorized" error.

**Solution**:
1. Verify `SERVICE_API_KEY` is set in both platform and customer app
2. Ensure keys match exactly
3. Check header is `x-service-api-key`

---

## Migration from Old System

If you have existing prompts with the old schema:

1. **Migration applied automatically**
   - Adds `prompt_identifier` column
   - Generates identifiers from existing `prompt_type:prompt_name`

2. **No data loss**
   - All existing prompts preserved
   - Identifiers auto-generated

3. **Update customer applications**
   - Change API calls from `?prompt_type=xxx` to `?type=xxx&name=xxx`
   - Use new response format with `isUsingDefault` flag

---

## Summary

✅ **Flexible** - Multiple prompts per type per customer
✅ **Safe** - Defaults required, no breaking changes
✅ **Organized** - Grouped by type, easy to manage
✅ **Powerful** - Side-by-side editing, inheritance
✅ **Scalable** - Add unlimited prompts and types

The system ensures every customer always has access to all prompt types through defaults, while allowing complete customization when needed.
