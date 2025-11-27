import { pgTable, uuid, varchar, text, timestamp, boolean, pgEnum, unique } from 'drizzle-orm/pg-core';

// Prompt type enum
export const promptTypeEnum = pgEnum('prompt_type', [
  'decoding',
  'validating',
  'extracting',
  'generating',
  'bifurcation',
  'custom'
]);

// Customer Prompts table - AI prompts for each customer
export const customerPrompts = pgTable('customer_prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerSlug: varchar('customer_slug', { length: 255 }).notNull(), // References customers.slug
  promptIdentifier: varchar('prompt_identifier', { length: 255 }).notNull(), // Format: "type:name" (e.g., "decoding:vendor-message")
  promptName: varchar('prompt_name', { length: 255 }).notNull(), // Human-readable name
  promptType: promptTypeEnum('prompt_type').notNull(), // Category: decoding, validating, etc.
  promptText: text('prompt_text').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 255 }),
  updatedBy: varchar('updated_by', { length: 255 }),
}, (table) => ({
  // Unique constraint: one prompt identifier per customer (allows multiple prompts of same type)
  uniqueCustomerPromptIdentifier: unique('unique_customer_prompt_identifier').on(table.customerSlug, table.promptIdentifier),
}));

// TypeScript type inferred from schema
export type CustomerPrompt = typeof customerPrompts.$inferSelect;
export type NewCustomerPrompt = typeof customerPrompts.$inferInsert;
