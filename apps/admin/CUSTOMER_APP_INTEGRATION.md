# Customer Application Integration Guide

## 🎯 Overview

This guide explains how your customer application (e.g., WeaveDesk, custom apps) can fetch and use AI prompts configured by the platform admin.

Each customer has access to customized prompts or default prompts for various operations like decoding messages, validating data, extracting information, and more.

---

## 🔑 Authentication

All API requests require a **Service API Key** for authentication.

### Setup

1. Get your Service API Key from the platform admin
2. Add it to your environment variables:

```env
# .env.local
PLATFORM_API_URL=https://your-platform-domain.com
CUSTOMER_SLUG=your-customer-slug
SERVICE_API_KEY=your-service-api-key-here
```

### Security Notes

- **Never expose the API key in client-side code**
- Store it in environment variables only
- Use it only in server-side API routes or backend services
- Rotate keys periodically for security

---

## 📡 API Endpoint

```
GET /api/customer-prompts/[slug]?type={type}&name={name}
```

### Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `slug` | string | Yes | Your customer slug (in URL path) | `acme-corp` |
| `type` | string | Yes | Prompt type category | `decoding`, `validating`, `extracting`, `generating`, `bifurcation`, `custom` |
| `name` | string | Yes | Specific prompt name | `vendor-message`, `customer-query` |

### Headers

```
x-service-api-key: your-service-api-key
```

### Response Format

```json
{
  "success": true,
  "prompt": {
    "id": "uuid",
    "customerSlug": "acme-corp",
    "promptIdentifier": "decoding:vendor-message",
    "promptName": "Vendor Message Decode",
    "promptType": "decoding",
    "promptText": "Your prompt text with {extracted_text} placeholder",
    "description": "Decodes vendor messages",
    "isActive": true,
    "createdAt": "2025-11-20T00:00:00.000Z",
    "updatedAt": "2025-11-20T00:00:00.000Z"
  },
  "isUsingDefault": false
}
```

### Response Fields

- `success`: Boolean indicating if request succeeded
- `prompt`: The prompt object
  - `promptText`: The actual AI prompt to use (may contain placeholders like `{extracted_text}`)
  - `promptIdentifier`: Unique ID in format `type:name`
  - `isActive`: Whether the prompt is currently active
- `isUsingDefault`: `true` if using platform default, `false` if using customer-specific customized prompt

---

## 💻 Integration Examples

### Example 1: Next.js API Route

```typescript
// app/api/prompts/fetch/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const name = searchParams.get('name');

  if (!type || !name) {
    return NextResponse.json(
      { error: 'type and name are required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${process.env.PLATFORM_API_URL}/api/customer-prompts/${process.env.CUSTOMER_SLUG}?type=${type}&name=${name}`,
      {
        headers: {
          'x-service-api-key': process.env.SERVICE_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch prompt');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}
```

### Example 2: Reusable Prompt Service

```typescript
// lib/services/prompt-service.ts

class PromptService {
  private baseUrl: string;
  private customerSlug: string;
  private apiKey: string;
  private cache: Map<string, { text: string; timestamp: number }>;
  private cacheTimeout: number = 1000 * 60 * 60; // 1 hour

  constructor() {
    this.baseUrl = process.env.PLATFORM_API_URL!;
    this.customerSlug = process.env.CUSTOMER_SLUG!;
    this.apiKey = process.env.SERVICE_API_KEY!;
    this.cache = new Map();
  }

  /**
   * Fetch a prompt by type and name
   */
  async fetchPrompt(type: string, name: string): Promise<string> {
    const cacheKey = `${type}:${name}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`[PromptService] Using cached prompt: ${cacheKey}`);
      return cached.text;
    }

    // Fetch from API
    console.log(`[PromptService] Fetching prompt: ${cacheKey}`);
    try {
      const response = await fetch(
        `${this.baseUrl}/api/customer-prompts/${this.customerSlug}?type=${type}&name=${name}`,
        {
          headers: {
            'x-service-api-key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch prompt');
      }

      const data = await response.json();
      const promptText = data.prompt.promptText;

      // Cache the result
      this.cache.set(cacheKey, {
        text: promptText,
        timestamp: Date.now(),
      });

      return promptText;
    } catch (error) {
      console.error(`[PromptService] Error fetching prompt ${cacheKey}:`, error);
      throw error;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear specific cached prompt
   */
  clearCachedPrompt(type: string, name: string): void {
    this.cache.delete(`${type}:${name}`);
  }
}

// Export singleton instance
export const promptService = new PromptService();
```

### Example 3: Using Prompts with AI Models

```typescript
// lib/ai/decoder.ts
import { promptService } from '@/lib/services/prompt-service';
import { openai } from '@/lib/openai'; // or your AI provider

/**
 * Decode vendor message using AI
 */
export async function decodeVendorMessage(vendorMessage: string) {
  // Fetch the prompt template
  const promptTemplate = await promptService.fetchPrompt('decoding', 'vendor-message');

  // Replace placeholders with actual content
  const finalPrompt = promptTemplate.replace('{extracted_text}', vendorMessage);

  // Send to AI model
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: finalPrompt,
      },
    ],
  });

  return response.choices[0].message.content;
}

/**
 * Validate customer query
 */
export async function validateCustomerQuery(query: string) {
  const promptTemplate = await promptService.fetchPrompt('validating', 'customer-query');
  const finalPrompt = promptTemplate.replace('{extracted_text}', query);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: finalPrompt }],
  });

  return response.choices[0].message.content;
}

/**
 * Extract fabric specifications
 */
export async function extractFabricSpecs(text: string) {
  const promptTemplate = await promptService.fetchPrompt('extracting', 'fabric-specs');
  const finalPrompt = promptTemplate.replace('{extracted_text}', text);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: finalPrompt }],
    response_format: { type: 'json_object' }, // For structured extraction
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}
```

### Example 4: Express.js Backend

```typescript
// routes/prompts.ts
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/decode-vendor-message', async (req, res) => {
  try {
    const { message } = req.body;

    // Fetch prompt
    const response = await fetch(
      `${process.env.PLATFORM_API_URL}/api/customer-prompts/${process.env.CUSTOMER_SLUG}?type=decoding&name=vendor-message`,
      {
        headers: {
          'x-service-api-key': process.env.SERVICE_API_KEY,
        },
      }
    );

    const data = await response.json();
    const promptText = data.prompt.promptText.replace('{extracted_text}', message);

    // Use prompt with AI...
    // const aiResponse = await yourAIService.generate(promptText);

    res.json({ success: true, prompt: promptText });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;
```

---

## 📋 Available Prompt Types

### 1. Decoding (`type=decoding`)

Extract and interpret information from raw text.

**Common Names:**
- `vendor-message` - Decode vendor messages
- `customer-message` - Decode customer messages
- `email-content` - Decode email content

**Usage:**
```typescript
const prompt = await promptService.fetchPrompt('decoding', 'vendor-message');
```

### 2. Validating (`type=validating`)

Check data completeness and accuracy.

**Common Names:**
- `customer-query` - Validate customer queries
- `vendor-response` - Validate vendor responses
- `order-data` - Validate order information

**Usage:**
```typescript
const prompt = await promptService.fetchPrompt('validating', 'customer-query');
```

### 3. Extracting (`type=extracting`)

Extract structured data from unstructured text.

**Common Names:**
- `fabric-specs` - Extract fabric specifications
- `pricing-info` - Extract pricing details
- `order-details` - Extract order information

**Usage:**
```typescript
const prompt = await promptService.fetchPrompt('extracting', 'fabric-specs');
```

### 4. Generating (`type=generating`)

Generate new content or responses.

**Common Names:**
- `inquiry-response` - Generate inquiry responses
- `follow-up-email` - Generate follow-up emails
- `quote-email` - Generate quote emails

**Usage:**
```typescript
const prompt = await promptService.fetchPrompt('generating', 'inquiry-response');
```

### 5. Bifurcation (`type=bifurcation`)

Make decisions and route items.

**Common Names:**
- `ticket-routing` - Route tickets to departments
- `priority-assignment` - Assign priority levels
- `category-classification` - Classify by category

**Usage:**
```typescript
const prompt = await promptService.fetchPrompt('bifurcation', 'ticket-routing');
```

### 6. Custom (`type=custom`)

Your custom prompt types.

**Usage:**
```typescript
const prompt = await promptService.fetchPrompt('custom', 'your-custom-name');
```

---

## 🎨 Placeholder Replacement

Most prompts include the `{extracted_text}` placeholder. Replace it with your actual content:

```typescript
const promptTemplate = await promptService.fetchPrompt('decoding', 'vendor-message');
const actualPrompt = promptTemplate.replace('{extracted_text}', yourActualText);
```

### Multiple Placeholders

If your custom prompts have multiple placeholders:

```typescript
const promptTemplate = await promptService.fetchPrompt('custom', 'my-prompt');
const finalPrompt = promptTemplate
  .replace('{customer_name}', customerName)
  .replace('{order_id}', orderId)
  .replace('{extracted_text}', extractedText);
```

---

## 🚦 Error Handling

### Common Error Responses

#### 1. Prompt Not Found (404)

```json
{
  "error": "No prompt found",
  "message": "Prompt 'decoding:vendor-message' not found for customer 'acme-corp' or in defaults.",
  "promptIdentifier": "decoding:vendor-message",
  "customerSlug": "acme-corp"
}
```

**Solution:** Contact platform admin to create the prompt.

#### 2. Unauthorized (401)

```json
{
  "error": "Unauthorized. Service API key required."
}
```

**Solution:** Check your `SERVICE_API_KEY` environment variable.

#### 3. Invalid Parameters (400)

```json
{
  "error": "Both \"type\" and \"name\" parameters are required."
}
```

**Solution:** Ensure both `type` and `name` are provided in the query string.

### Recommended Error Handling

```typescript
async function fetchPromptSafely(type: string, name: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${process.env.PLATFORM_API_URL}/api/customer-prompts/${process.env.CUSTOMER_SLUG}?type=${type}&name=${name}`,
      {
        headers: {
          'x-service-api-key': process.env.SERVICE_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();

      if (response.status === 404) {
        console.error(`Prompt not found: ${type}:${name}`);
        console.error('Please contact platform admin to create this prompt.');
        return null;
      }

      if (response.status === 401) {
        console.error('Unauthorized: Check your SERVICE_API_KEY');
        return null;
      }

      throw new Error(error.message || 'Failed to fetch prompt');
    }

    const data = await response.json();
    return data.prompt.promptText;
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return null;
  }
}
```

---

## 🎯 Best Practices

### 1. Cache Prompts

Prompts don't change frequently. Cache them to reduce API calls:

```typescript
// Cache for 1 hour
const CACHE_DURATION = 1000 * 60 * 60;

const promptCache = new Map();

async function getCachedPrompt(type: string, name: string) {
  const key = `${type}:${name}`;
  const cached = promptCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.text;
  }

  const text = await fetchPrompt(type, name);
  promptCache.set(key, { text, timestamp: Date.now() });
  return text;
}
```

### 2. Validate Before Use

Always check if the prompt was fetched successfully:

```typescript
const prompt = await fetchPrompt('decoding', 'vendor-message');
if (!prompt) {
  throw new Error('Failed to load prompt');
}
```

### 3. Log Usage

Track which prompts are being used and whether they're custom or default:

```typescript
const data = await fetchPrompt(type, name);
console.log(`Using ${data.isUsingDefault ? 'default' : 'custom'} prompt: ${type}:${name}`);
```

### 4. Handle Fallbacks

Have fallback prompts for critical operations:

```typescript
async function getPromptWithFallback(type: string, name: string, fallback: string) {
  try {
    return await fetchPrompt(type, name);
  } catch (error) {
    console.warn(`Failed to fetch prompt, using fallback: ${type}:${name}`);
    return fallback;
  }
}
```

### 5. Refresh Cache Strategically

Implement a manual cache refresh endpoint:

```typescript
// app/api/prompts/refresh/route.ts
export async function POST() {
  promptService.clearCache();
  return NextResponse.json({ success: true, message: 'Cache cleared' });
}
```

---

## 🔄 Complete Integration Workflow

### Step 1: Setup Environment

```env
PLATFORM_API_URL=https://platform.example.com
CUSTOMER_SLUG=acme-corp
SERVICE_API_KEY=your-api-key-here
```

### Step 2: Create Prompt Service

Use the `PromptService` class from Example 2 above.

### Step 3: Use in Your Application

```typescript
import { promptService } from '@/lib/services/prompt-service';

// In your business logic
async function processVendorMessage(message: string) {
  // 1. Fetch the prompt
  const promptTemplate = await promptService.fetchPrompt('decoding', 'vendor-message');

  // 2. Replace placeholders
  const finalPrompt = promptTemplate.replace('{extracted_text}', message);

  // 3. Send to AI
  const decoded = await yourAIService.generate(finalPrompt);

  // 4. Process result
  return decoded;
}
```

### Step 4: Monitor and Log

```typescript
console.log('[Prompts] Loaded vendor-message prompt');
console.log('[Prompts] Using default:', data.isUsingDefault);
```

---

## 📊 Testing

### Test Your Integration

```typescript
// test/prompts.test.ts
import { promptService } from '@/lib/services/prompt-service';

describe('Prompt Service', () => {
  it('should fetch decoding prompt', async () => {
    const prompt = await promptService.fetchPrompt('decoding', 'vendor-message');
    expect(prompt).toBeTruthy();
    expect(prompt).toContain('{extracted_text}');
  });

  it('should handle missing prompts', async () => {
    await expect(
      promptService.fetchPrompt('invalid', 'nonexistent')
    ).rejects.toThrow();
  });

  it('should cache prompts', async () => {
    const prompt1 = await promptService.fetchPrompt('decoding', 'vendor-message');
    const prompt2 = await promptService.fetchPrompt('decoding', 'vendor-message');
    expect(prompt1).toBe(prompt2);
  });
});
```

---

## 🆘 Troubleshooting

### Issue: "Unauthorized" error

**Check:**
- Is `SERVICE_API_KEY` set correctly?
- Does it match the key on the platform?
- Is the header name exactly `x-service-api-key`?

### Issue: "Prompt not found" error

**Check:**
- Does the default prompt exist on the platform?
- Is the `type` and `name` combination correct?
- Ask platform admin to verify prompt exists

### Issue: Prompts not updating

**Solution:**
- Clear your cache: `promptService.clearCache()`
- Check if you're using cached prompts
- Verify the prompt was actually updated on the platform

### Issue: Rate limiting or slow responses

**Solution:**
- Implement aggressive caching (cache for several hours)
- Fetch prompts at application startup
- Consider storing prompts in your own database

---

## 📞 Support

If you encounter issues:

1. Check this documentation
2. Verify your environment variables
3. Test API endpoint with curl/Postman
4. Contact platform admin for:
   - Missing prompts
   - API key issues
   - Custom prompt types

---

## 🎉 Quick Start Checklist

- [ ] Get Service API Key from platform admin
- [ ] Set up environment variables (`PLATFORM_API_URL`, `CUSTOMER_SLUG`, `SERVICE_API_KEY`)
- [ ] Copy `PromptService` class to your project
- [ ] Test fetching a prompt
- [ ] Implement caching
- [ ] Add error handling
- [ ] Integrate with your AI service
- [ ] Monitor usage and performance

---

**Need a prompt created?** Contact your platform admin to configure new prompts or customize existing ones.

**Questions?** Reach out to the platform team for support.
