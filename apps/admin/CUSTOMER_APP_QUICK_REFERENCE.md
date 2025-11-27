# Customer App Integration - Quick Reference

## 🚀 Quick Setup

```env
# .env.local
PLATFORM_API_URL=https://platform.example.com
CUSTOMER_SLUG=your-slug
SERVICE_API_KEY=your-api-key
```

---

## 📡 API Call

```typescript
const response = await fetch(
  `${process.env.PLATFORM_API_URL}/api/customer-prompts/${process.env.CUSTOMER_SLUG}?type=decoding&name=vendor-message`,
  {
    headers: {
      'x-service-api-key': process.env.SERVICE_API_KEY!,
    },
  }
);

const data = await response.json();
const promptText = data.prompt.promptText;
```

---

## 🎯 Prompt Types & Common Names

| Type | Common Names |
|------|--------------|
| **decoding** | `vendor-message`, `customer-message`, `email-content` |
| **validating** | `customer-query`, `vendor-response`, `order-data` |
| **extracting** | `fabric-specs`, `pricing-info`, `order-details` |
| **generating** | `inquiry-response`, `follow-up-email`, `quote-email` |
| **bifurcation** | `ticket-routing`, `priority-assignment`, `category-classification` |
| **custom** | Your custom names |

---

## 💻 Copy-Paste Service Class

```typescript
// lib/services/prompt-service.ts
class PromptService {
  private cache = new Map<string, { text: string; timestamp: number }>();
  private cacheTimeout = 1000 * 60 * 60; // 1 hour

  async fetchPrompt(type: string, name: string): Promise<string> {
    const key = `${type}:${name}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.text;
    }

    const response = await fetch(
      `${process.env.PLATFORM_API_URL}/api/customer-prompts/${process.env.CUSTOMER_SLUG}?type=${type}&name=${name}`,
      {
        headers: { 'x-service-api-key': process.env.SERVICE_API_KEY! },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch prompt');

    const data = await response.json();
    this.cache.set(key, { text: data.prompt.promptText, timestamp: Date.now() });
    return data.prompt.promptText;
  }

  clearCache() { this.cache.clear(); }
}

export const promptService = new PromptService();
```

---

## 🔄 Usage Example

```typescript
import { promptService } from '@/lib/services/prompt-service';

// Fetch prompt
const promptTemplate = await promptService.fetchPrompt('decoding', 'vendor-message');

// Replace placeholder
const finalPrompt = promptTemplate.replace('{extracted_text}', yourText);

// Send to AI
const result = await aiService.generate(finalPrompt);
```

---

## ⚠️ Error Codes

| Status | Error | Solution |
|--------|-------|----------|
| 401 | Unauthorized | Check `SERVICE_API_KEY` |
| 404 | Prompt not found | Ask admin to create prompt |
| 400 | Invalid parameters | Include both `type` and `name` |

---

## 🎨 Placeholder Replacement

```typescript
// Single placeholder
prompt.replace('{extracted_text}', yourText)

// Multiple placeholders
prompt
  .replace('{customer_name}', name)
  .replace('{order_id}', id)
  .replace('{extracted_text}', text)
```

---

## 📋 Response Format

```json
{
  "success": true,
  "prompt": {
    "promptText": "Your AI prompt with {extracted_text}",
    "promptIdentifier": "decoding:vendor-message",
    "isActive": true
  },
  "isUsingDefault": false
}
```

---

## ✅ Checklist

- [ ] Set environment variables
- [ ] Copy `PromptService` class
- [ ] Test with: `promptService.fetchPrompt('decoding', 'vendor-message')`
- [ ] Add error handling
- [ ] Implement caching
- [ ] Replace `{extracted_text}` placeholder
- [ ] Integrate with AI service

---

**Full Documentation:** See `CUSTOMER_APP_INTEGRATION.md`
