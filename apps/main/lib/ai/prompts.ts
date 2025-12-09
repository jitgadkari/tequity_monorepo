/**
 * Prompt Templates for RAG System
 * Matches Python backend's prompt_manager.py functionality
 */

import { FINANCIAL_CATEGORIES } from '@/lib/file-processing'

// Category keywords for classification
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Accounts Payable': ['payable', 'ap', 'vendor invoice', 'outstanding payment', 'vendor payable', 'payment due'],
  'Accounts Receivable': ['receivable', 'ar', 'customer invoice', 'pending receivable', 'customer payment', 'invoice outstanding'],
  'Cap Table': ['cap table', 'capitalization', 'equity', 'ownership', 'shares', 'shareholders', 'stock ownership'],
  'Customer Contracts': ['customer contract', 'agreement', 'customer deal', 'customer agreement', 'contract terms'],
  'Financial Projections': ['projection', 'forecast', 'future financial', 'budget', 'projection', 'forecast'],
  'Monthly Financials': ['monthly financial', 'monthly report', 'month', 'cogs', 'revenue', 'gross profit', 'p&l', 'profit and loss', 'balance sheet', 'cash flow', 'financial statement', 'monthly data', 'financial performance', 'income statement', 'expenses', 'sales', 'profit', 'loss'],
  'Revenue By Customer': ['revenue by customer', 'customer revenue', 'customer sales', 'client revenue'],
  'Stock Option Grants': ['stock option', 'grant', 'employee equity', 'option grant', 'equity compensation'],
  'Vendor Contracts': ['vendor contract', 'vendor agreement', 'supplier contract', 'vendor terms'],
  'YTD Financials': ['ytd', 'year to date', 'year-to-date', 'current year', 'fiscal year'],
}

/**
 * Generate prompt for financial category classification
 * Matches Python: get_financial_category_prompt()
 */
export function getFinancialCategoryPrompt(query: string): string {
  const categoriesStr = Object.entries(CATEGORY_KEYWORDS)
    .map(([cat, keywords]) => `• ${cat}: ${keywords.slice(0, 3).join(', ')}`)
    .join('\n')

  return `You are an expert financial data classifier. Analyze the user's question to determine which financial data category would best answer their query.

Available Categories:
${categoriesStr}

User Query: "${query}"

Classification Rules:
1. Focus on the INTENT of the question, not just keywords
2. Consider what type of financial data would contain the answer
3. "Cap table" questions → Cap Table category
4. Revenue/profit/expense analysis → Monthly Financials
5. YTD/year-to-date data → YTD Financials
6. Customer payment issues → Accounts Receivable
7. Vendor payment issues → Accounts Payable
8. Future planning → Financial Projections

Return ONLY the exact category name. If uncertain, return "Monthly Financials".

Category:`
}

/**
 * Generate prompt for basic Q&A
 * Matches Python: get_basic_qa_prompt()
 */
export function getBasicQAPrompt(context: string, query: string): string {
  return `You are a helpful financial assistant analyzing financial data. Answer the user's question using ONLY the information provided in the context below.

IMPORTANT INSTRUCTIONS:
1. The context contains actual data from the user's financial files
2. Use the data in the context to provide specific, accurate answers
3. Include relevant numbers, dates, and details from the context
4. ONLY say you don't have the information if the context is completely empty or contains no relevant data for the specific question
5. If you find relevant data in the context, you MUST use it to answer the question

Context:
${context}

Question: ${query}

Answer:`
}

/**
 * Generate prompt for exact lookups (invoice numbers, customer IDs, etc.)
 */
export function getExactLookupPrompt(
  context: string,
  query: string,
  keywords: string[]
): string {
  return `You are a financial data assistant. The user is looking for SPECIFIC information about: ${keywords.join(', ')}.

The context below contains data from financial documents. Your task is to find and present the EXACT details requested.

Context:
${context}

Question: ${query}

INSTRUCTIONS:
1. Look for the exact identifiers mentioned: ${keywords.join(', ')}
2. If found, provide ALL available details for those specific records
3. Format the answer clearly with field names and values
4. If NOT found in the context, explicitly state "The requested ${keywords.join(', ')} was not found in the available data"
5. Do NOT make up or infer information

Answer:`
}

/**
 * Generate prompt for aggregation queries (sum, average, max, etc.)
 */
export function getAggregationPrompt(
  context: string,
  query: string,
  aggregationType: string,
  groupByField: string | null
): string {
  return `You are a financial data analyst. The user is asking for AGGREGATED analysis.

Context (Raw Data):
${context}

Question: ${query}

CRITICAL INSTRUCTIONS:
1. This query requires ${aggregationType}${groupByField ? ` by ${groupByField}` : ''} calculation
2. Analyze ALL the data provided in the context
3. Group the data by ${groupByField || 'the relevant field'}
4. Calculate the ${aggregationType} for each group
5. Present results in a clear table or list format
6. Show your calculations/reasoning
7. Identify the ${aggregationType === 'max' ? 'highest' : aggregationType === 'min' ? 'lowest' : 'top'} result

Example format:
${groupByField ? `By ${groupByField}:
- [${groupByField} 1]: [value] ([calculation if relevant])
- [${groupByField} 2]: [value] ([calculation if relevant])

${aggregationType === 'max' ? 'Highest' : aggregationType === 'min' ? 'Lowest' : 'Result'}: [answer]` : '[Calculated result with explanation]'}

Answer:`
}

/**
 * Generate prompt for combined answer from multiple sub-queries
 */
export function getCombinedAnswerPrompt(query: string, contextParts: string[]): string {
  const combinedContext = contextParts.join('\n\n')

  return `Answer this question using the provided context. Be concise and specific.

Question: ${query}

Context:
${combinedContext}

Answer:`
}

/**
 * Generate prompt for query decomposition
 */
export function getDecompositionPrompt(query: string): string {
  return `Does this query need to be split into sub-questions to be answered properly?

Query: "${query}"

If YES, split it into 2-3 focused sub-questions. If NO, return just the original query.

Rules:
- Only split if it genuinely improves answering
- Each sub-question should be complete and answerable independently
- Avoid splitting simple single-concept questions

Response format: Return only the questions, one per line.`
}

/**
 * Generate prompt for complex query decomposition
 */
export function getComplexDecompositionPrompt(query: string): string {
  return `Break this complex question into 2-3 focused sub-questions. Only decompose if it will genuinely help answer the question better.

Question: ${query}

Return only the sub-questions, one per line. If the question is better answered as-is, return just the original question.`
}

/**
 * System prompt for financial assistant
 */
export const FINANCIAL_ASSISTANT_SYSTEM_PROMPT = `You are a knowledgeable financial assistant with expertise in:
- Financial statements analysis (P&L, Balance Sheet, Cash Flow)
- Accounts payable and receivable
- Cap table and equity structures
- Customer and vendor contracts
- Financial projections and forecasting

When answering questions:
1. Be precise with numbers and dates
2. Reference source files when available
3. If information is incomplete, acknowledge it
4. Suggest relevant follow-up questions when appropriate
5. Format numbers consistently (currency, percentages)
`

/**
 * Prompt for file description generation
 */
export function getFileDescriptionPrompt(filename: string, sampleContent: string): string {
  return `Based on the filename and sample content below, write a brief 1-2 sentence description of what this financial document contains.

Filename: ${filename}

Sample Content:
${sampleContent}

Description:`
}

/**
 * Prompt for identifying file relevance
 */
export function getFileRelevancePrompt(query: string, fileInfo: { filename: string; category: string; description?: string }): string {
  return `Rate how relevant this file is to the user's question on a scale of 0-10.

User Question: "${query}"

File Information:
- Filename: ${fileInfo.filename}
- Category: ${fileInfo.category}
${fileInfo.description ? `- Description: ${fileInfo.description}` : ''}

Respond with just a number from 0-10.

Relevance:`
}

export { FINANCIAL_CATEGORIES }
