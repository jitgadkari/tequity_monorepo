/**
 * File Category Classifier
 * Matches Python backend's get_category logic
 * Uses LLM to classify files into financial categories
 */

import OpenAI from 'openai'
import { FINANCIAL_CATEGORIES, FinancialCategory, SheetInfo } from './types'
import { getExcelContentPreview } from './excel-extractor'

// Lazy initialization to avoid build-time errors when env vars aren't set
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return _openai
}

const OPENAI_LLM_MODEL = process.env.OPENAI_LLM_MODEL || 'gpt-4o'

/**
 * Get financial category for a file using LLM analysis.
 * Matches Python: get_category()
 *
 * @param filename - The name of the file
 * @param buffer - Optional file buffer for content analysis
 * @returns The most appropriate financial category
 */
export async function getCategory(
  filename: string,
  buffer?: Buffer
): Promise<FinancialCategory | 'Unknown'> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[Category Classifier] OpenAI API key not available, using rule-based fallback')
    return getRuleBasedCategory(filename)
  }

  try {
    // Get file content preview if buffer is provided
    let contentInfo = ''
    if (buffer) {
      const fileExt = filename.split('.').pop()?.toLowerCase()

      if (fileExt === 'xlsx' || fileExt === 'xls') {
        const preview = getExcelContentPreview(buffer)
        if (Object.keys(preview).length > 0) {
          contentInfo = '\n\nFile Content Analysis:\n'
          for (const [sheetName, sheetData] of Object.entries(preview)) {
            contentInfo += `\nSheet: ${sheetName}\n`
            contentInfo += `Columns (${sheetData.columnCount} total): ${sheetData.columns?.join(', ') || 'N/A'}\n`

            if (sheetData.sampleRow) {
              contentInfo += 'Sample Row Data:\n'
              const entries = Object.entries(sheetData.sampleRow).slice(0, 8)
              for (const [col, val] of entries) {
                if (val !== '' && val !== null && val !== undefined) {
                  const valStr = String(val)
                  contentInfo += `  ${col}: ${valStr.substring(0, 50)}${valStr.length > 50 ? '...' : ''}\n`
                }
              }
            }
            contentInfo += `Total Rows: ${sheetData.rowCount}\n`
          }
        }
      }
    }

    // Create prompt (matching Python)
    const categoriesList = FINANCIAL_CATEGORIES.join(', ')
    const prompt = `
You are a financial data categorization expert. Analyze the following file information and determine which financial category it belongs to.

Filename: ${filename}${contentInfo}

Available categories:
${categoriesList}

Instructions:
1. Analyze the filename for financial keywords and patterns
2. If file content is provided, examine the structure and sample data
3. For Excel files: Column names are the strongest indicator of document type
4. For text files: Look for financial terms, numbers, and document structure
5. Consider common financial document naming conventions
6. Consider data patterns in sample rows
7. Look for indicators like "AP" (Accounts Payable), "AR" (Accounts Receivable), "YTD" (Year to Date), etc.
8. Choose the MOST APPROPRIATE category from the list above
9. Return ONLY the category name, exactly as it appears in the list

Examples:
- File with columns like "Vendor Name", "Amount Due", "Due Date" → Accounts Payable
- File with columns like "Customer", "Invoice Date", "Amount" → Accounts Receivable
- File with columns like "Shareholder", "Shares", "Percentage" → Cap Table
- File with columns like "Revenue", "Month", "Year" → Monthly Financials

Category:`

    const response = await getOpenAI().chat.completions.create({
      model: OPENAI_LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0, // Zero temperature for consistent categorization
    })

    const category = response.choices[0]?.message?.content?.trim()

    if (category) {
      // Validate that the returned category is in our list
      if (FINANCIAL_CATEGORIES.includes(category as FinancialCategory)) {
        console.log(`[Category Classifier] LLM categorized '${filename}' as '${category}'`)
        return category as FinancialCategory
      }

      // Try to find a close match
      const categoryLower = category.toLowerCase()
      for (const validCategory of FINANCIAL_CATEGORIES) {
        if (
          categoryLower.includes(validCategory.toLowerCase()) ||
          validCategory.toLowerCase().includes(categoryLower)
        ) {
          console.log(`[Category Classifier] LLM categorized '${filename}' as '${validCategory}' (matched from '${category}')`)
          return validCategory
        }
      }

      console.warn(`[Category Classifier] LLM returned invalid category '${category}' for '${filename}', defaulting to 'Monthly Financials'`)
      return 'Monthly Financials'
    }

    console.warn(`[Category Classifier] Empty response from LLM for '${filename}', defaulting to 'Monthly Financials'`)
    return 'Monthly Financials'
  } catch (error) {
    console.error(`[Category Classifier] Error in LLM category mapping for '${filename}':`, error)
    return getRuleBasedCategory(filename)
  }
}

/**
 * Rule-based category fallback (matches Python fallback logic)
 */
function getRuleBasedCategory(filename: string): FinancialCategory {
  const filenameLower = filename.toLowerCase()

  if (filenameLower.includes('ap') || filenameLower.includes('payable')) {
    return 'Accounts Payable'
  }
  if (filenameLower.includes('ar') || filenameLower.includes('receivable')) {
    return 'Accounts Receivable'
  }
  if (filenameLower.includes('cap') && filenameLower.includes('table')) {
    return 'Cap Table'
  }
  if (filenameLower.includes('customer') && (filenameLower.includes('contract') || filenameLower.includes('agreement'))) {
    return 'Customer Contracts'
  }
  if (filenameLower.includes('vendor') && (filenameLower.includes('contract') || filenameLower.includes('agreement'))) {
    return 'Vendor Contracts'
  }
  if (filenameLower.includes('projection') || filenameLower.includes('forecast')) {
    return 'Financial Projections'
  }
  if (filenameLower.includes('revenue') && filenameLower.includes('customer')) {
    return 'Revenue By Customer'
  }
  if (filenameLower.includes('stock') && filenameLower.includes('option')) {
    return 'Stock Option Grants'
  }
  if (filenameLower.includes('ytd') || filenameLower.includes('year')) {
    return 'YTD Financials'
  }
  if (filenameLower.includes('monthly') || filenameLower.includes('financial')) {
    return 'Monthly Financials'
  }
  if (filenameLower.includes('balance') && filenameLower.includes('sheet')) {
    return 'Balance Sheet'
  }
  if (filenameLower.includes('income') && filenameLower.includes('statement')) {
    return 'Income Statement'
  }
  if (filenameLower.includes('cash') && filenameLower.includes('flow')) {
    return 'Cash Flow'
  }
  if (filenameLower.includes('budget')) {
    return 'Budget'
  }
  if (filenameLower.includes('expense')) {
    return 'Expenses'
  }
  if (filenameLower.includes('payroll')) {
    return 'Payroll'
  }
  if (filenameLower.includes('tax')) {
    return 'Tax Documents'
  }

  // Default fallback
  return 'Monthly Financials'
}

/**
 * Generate a basic description based on filename and content analysis
 * Matches Python: generate_basic_description()
 */
export function generateBasicDescription(filename: string, textChunks: string[]): string {
  const fileExtension = filename.split('.').pop()?.toLowerCase() || ''

  const typeDescriptions: Record<string, string> = {
    pdf: 'PDF document',
    docx: 'Word document',
    txt: 'Text document',
    xlsx: 'Excel spreadsheet',
    xls: 'Excel spreadsheet',
    csv: 'CSV file',
  }

  const baseDesc = typeDescriptions[fileExtension] || 'Document'

  // Analyze content for keywords
  const contentSample = textChunks.slice(0, 2).join(' ').toLowerCase()

  const keywords: string[] = []
  if (['financial', 'revenue', 'expense', 'budget'].some(word => contentSample.includes(word))) {
    keywords.push('financial data')
  }
  if (['contract', 'agreement', 'terms'].some(word => contentSample.includes(word))) {
    keywords.push('contractual information')
  }
  if (['report', 'analysis', 'summary'].some(word => contentSample.includes(word))) {
    keywords.push('analytical content')
  }
  if (['customer', 'client', 'account'].some(word => contentSample.includes(word))) {
    keywords.push('customer information')
  }

  if (keywords.length > 0) {
    return `${baseDesc} containing ${keywords.join(', ')}`
  }

  return `${baseDesc} with ${textChunks.length} sections of content`
}

/**
 * Generate AI-powered file description
 * Matches Python: generate_file_description()
 */
export async function generateFileDescription(
  filename: string,
  textChunks: string[]
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return generateBasicDescription(filename, textChunks)
  }

  try {
    // Use first few chunks for description generation
    let sampleContent = textChunks.slice(0, 3).join('\n')
    if (sampleContent.length > 2000) {
      sampleContent = sampleContent.substring(0, 2000) + '...'
    }

    const prompt = `Analyze the following document content and generate a concise description (2-3 sentences) that captures:
1. The main topic/subject matter
2. The type of information contained
3. Key themes or categories

Filename: ${filename}

Content sample:
${sampleContent}

Description:`

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.3,
    })

    const description = response.choices[0]?.message?.content?.trim()

    if (description) {
      console.log(`[Description Generator] Generated AI description for ${filename}`)
      return description
    }

    return generateBasicDescription(filename, textChunks)
  } catch (error) {
    console.warn('[Description Generator] Failed to generate AI description:', error)
    return generateBasicDescription(filename, textChunks)
  }
}
