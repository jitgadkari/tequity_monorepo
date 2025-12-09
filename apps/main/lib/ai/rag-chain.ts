/**
 * RAG Chain Module
 * Orchestrates the Retrieval-Augmented Generation pipeline
 * Matches Python backend's client.py and optimized_query_processor.py functionality
 */

import OpenAI from 'openai'
import type { PrismaClient } from '@prisma/tenant-client'
import { getQueryEmbedding } from './embeddings'
import { searchMultiFile, searchByFiles, searchByKeyword, SearchResult } from './vector-store'
import {
  getFinancialCategoryPrompt,
  getBasicQAPrompt,
  getExactLookupPrompt,
  getAggregationPrompt,
  getCombinedAnswerPrompt,
  getDecompositionPrompt,
  CATEGORY_KEYWORDS,
  FINANCIAL_ASSISTANT_SYSTEM_PROMPT,
} from './prompts'

// Type alias for tenant prisma client
type TenantPrismaClient = PrismaClient

const OPENAI_LLM_MODEL = process.env.OPENAI_LLM_MODEL || 'gpt-4o'

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

export interface RAGResponse {
  answer: string
  sources: {
    fileId?: string
    sourceFile?: string
    category?: string
    content: string
    similarity: number
  }[]
  category: string
  subQueries?: string[]
  processingTime: number
}

export interface QueryClassification {
  category: string
  complexity: number
  canAnswerFromMetadata: boolean
  processingStrategy: 'simple' | 'moderate' | 'complex'
}

/**
 * Get related categories for fallback search
 */
function getRelatedCategories(category: string): string[] {
  const relations: Record<string, string[]> = {
    'Accounts Payable': ['Accounts Receivable', 'Vendor Contracts'],
    'Accounts Receivable': ['Accounts Payable', 'Customer Contracts'],
    'Customer Contracts': ['Revenue By Customer', 'Accounts Receivable'],
    'Vendor Contracts': ['Accounts Payable'],
    'Financial Projections': ['Monthly Financials', 'YTD Financials'],
    'Monthly Financials': ['YTD Financials', 'Financial Projections'],
    'YTD Financials': ['Monthly Financials'],
    'Revenue By Customer': ['Customer Contracts', 'Monthly Financials'],
  }
  
  return relations[category] || []
}

/**
 * Enhanced category identification with rule-based pre-classification
 */
export async function identifyCategory(query: string): Promise<{
  primary: string
  fallback: string[]
  searchStrategy: 'single' | 'multi'
  requiresAggregation: boolean
}> {
  console.log(`[RAG] Identifying category for query: "${query.substring(0, 50)}..."`)
  
  // Pre-classification rules for common misclassifications
  const queryLower = query.toLowerCase()
  
  // Geography-related queries ALWAYS need Revenue By Customer
  if (/geography|geographic|region|country|location|apac|emea|north america|india|europe/i.test(query)) {
    console.log('[RAG] Detected geography query → Revenue By Customer')
    return {
      primary: 'Revenue By Customer',
      fallback: ['Customer Contracts'],
      searchStrategy: 'single',
      requiresAggregation: true
    }
  }
  
  // Industry-related queries ALWAYS need Revenue By Customer
  if (/industry|industries|sector|vertical|fintech|retail|manufacturing|media|healthcare/i.test(query)) {
    console.log('[RAG] Detected industry query → Revenue By Customer')
    return {
      primary: 'Revenue By Customer',
      fallback: [],
      searchStrategy: 'single',
      requiresAggregation: true
    }
  }
  
  // Customer revenue/sales queries
  if (/customer (revenue|sales)|revenue (by|from|per) customer|which customer/i.test(query)) {
    console.log('[RAG] Detected customer revenue query → Revenue By Customer')
    return {
      primary: 'Revenue By Customer',
      fallback: ['Monthly Financials'],
      searchStrategy: 'single',
      requiresAggregation: true
    }
  }
  
  // Invoice/document lookups with IDs
  if (/INV-\d+/i.test(query)) {
    console.log('[RAG] Detected invoice ID → Accounts Receivable')
    return {
      primary: 'Accounts Receivable',
      fallback: ['Accounts Payable'],
      searchStrategy: 'multi',
      requiresAggregation: false
    }
  }
  
  // Person names for stock options
  if (/vesting schedule of|stock options for|grants for|grantee|employee.*option/i.test(query)) {
    console.log('[RAG] Detected stock option query → Stock Option Grants')
    return {
      primary: 'Stock Option Grants',
      fallback: [],
      searchStrategy: 'single',
      requiresAggregation: false
    }
  }
  
  // YTD queries
  if (/ytd|year to date|year-to-date/i.test(query)) {
    console.log('[RAG] Detected YTD query → YTD Financials')
    return {
      primary: 'YTD Financials',
      fallback: ['Monthly Financials'],
      searchStrategy: 'single',
      requiresAggregation: false
    }
  }
  
  // Financial projections
  if (/projection|forecast|future|expected|next year|2026|2027/i.test(query)) {
    console.log('[RAG] Detected projection query → Financial Projections')
    return {
      primary: 'Financial Projections',
      fallback: [],
      searchStrategy: 'single',
      requiresAggregation: false
    }
  }
  
  // Fall back to LLM classification
  try {
    const prompt = getFinancialCategoryPrompt(query)
    const response = await getOpenAI().chat.completions.create({
      model: OPENAI_LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 30,
      temperature: 0,
    })

    const category = response.choices[0].message.content?.trim() || 'Monthly Financials'
    
    if (category in CATEGORY_KEYWORDS) {
      console.log(`[RAG] LLM identified category: ${category}`)
      return {
        primary: category,
        fallback: getRelatedCategories(category),
        searchStrategy: 'single',
        requiresAggregation: false
      }
    }
    
    return {
      primary: 'Monthly Financials',
      fallback: [],
      searchStrategy: 'single',
      requiresAggregation: false
    }
  } catch (error) {
    console.error('[RAG] Error identifying category:', error)
    return {
      primary: 'Monthly Financials',
      fallback: [],
      searchStrategy: 'single',
      requiresAggregation: false
    }
  }
}

/**
 * Classify query complexity and determine processing strategy
 */
export async function classifyQuery(query: string): Promise<QueryClassification> {
  // Simple heuristics for complexity
  const words = query.split(/\s+/).length
  const hasComparison = /compare|vs|versus|difference|between/i.test(query)
  const hasMultipleQuestions = query.includes('?') && query.split('?').length > 2
  const hasTimeRange = /year|month|quarter|ytd|yoy|trend/i.test(query)

  let complexity = 1
  if (words > 20) complexity++
  if (hasComparison) complexity += 2
  if (hasMultipleQuestions) complexity += 2
  if (hasTimeRange) complexity++

  // Identify category
  const categoryInfo = await identifyCategory(query)

  // Determine processing strategy
  let processingStrategy: 'simple' | 'moderate' | 'complex' = 'simple'
  if (complexity > 4) processingStrategy = 'complex'
  else if (complexity > 2) processingStrategy = 'moderate'

  // Check if can answer from metadata (e.g., "what files do you have?")
  const metadataQueries = /what files|list files|available documents|show me files/i
  const canAnswerFromMetadata = metadataQueries.test(query)

  return {
    category: categoryInfo.primary,
    complexity,
    canAnswerFromMetadata,
    processingStrategy,
  }
}

/**
 * Decompose a complex query into sub-queries
 * Matches Python: optimized_decompose_query()
 */
export async function decomposeQuery(query: string, complexity: number): Promise<string[]> {
  // Skip decomposition for simple queries
  if (complexity <= 2) {
    console.log('[RAG] Skipping decomposition - query is simple enough')
    return [query]
  }

  console.log('[RAG] Decomposing complex query...')

  try {
    const prompt = getDecompositionPrompt(query)

    const response = await getOpenAI().chat.completions.create({
      model: OPENAI_LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0,
    })

    const result = response.choices[0].message.content
    if (!result) return [query]

    // Parse sub-questions
    const subQueries: string[] = []
    for (const line of result.trim().split('\n')) {
      const cleaned = line.trim().replace(/^[1234567890.\-)\s]+/, '').trim()
      if (cleaned && cleaned.length > 10 && !subQueries.includes(cleaned)) {
        subQueries.push(cleaned)
      }
    }

    // Validate decomposition benefit
    if (subQueries.length <= 1 || subQueries.length > 3) {
      console.log('[RAG] Decomposition not beneficial, using original query')
      return [query]
    }

    console.log(`[RAG] Decomposed into ${subQueries.length} sub-queries`)
    return subQueries
  } catch (error) {
    console.warn('[RAG] Decomposition failed:', error)
    return [query]
  }
}

/**
 * Validate and clean context chunks
 * Matches Python: validate_context()
 */
function validateContext(chunks: SearchResult[]): string[] {
  if (!chunks || chunks.length === 0) {
    console.warn('[RAG] Empty context chunks provided')
    return []
  }

  const validChunks: string[] = []
  for (const chunk of chunks) {
    const text = chunk.text || chunk.content
    if (text && text.trim()) {
      validChunks.push(text.trim())
    }
  }

  return validChunks
}

/**
 * Generate answer from context
 * Matches Python: generate_answer()
 */
export async function generateAnswer(query: string, contextChunks: string[]): Promise<string> {
  if (!contextChunks || contextChunks.length === 0) {
    return "I might not have the files containing that information."
  }

  // Limit context size to avoid token limits
  const maxContextLength = 3000
  let context = contextChunks.join('\n')
  if (context.length > maxContextLength) {
    console.log(`[RAG] Truncating context from ${context.length} to ${maxContextLength} chars`)
    context = context.substring(0, maxContextLength).split('.').slice(0, -1).join('.') + '.'
  }

  try {
    const prompt = getBasicQAPrompt(context, query)

    const response = await getOpenAI().chat.completions.create({
      model: OPENAI_LLM_MODEL,
      messages: [
        { role: 'system', content: FINANCIAL_ASSISTANT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 512,
      temperature: 0,
    })

    const content = response.choices[0].message.content
    return content?.trim() || "I apologize, but I couldn't generate a response."
  } catch (error) {
    console.error('[RAG] Error generating answer:', error)
    throw error
  }
}

/**
 * Filter out low-value results (metadata, data dictionaries)
 */
function filterLowValueResults(results: SearchResult[]): SearchResult[] {
  const filtered = results.filter(result => {
    const content = result.content.toLowerCase()
    
    // Filter out data dictionary entries
    if (content.includes('data dictionary') || content.includes('sheet: meta')) {
      return false
    }
    
    // Filter out field definitions
    if (content.match(/field:.*type:.*description:/)) {
      return false
    }
    
    return true
  })
  
  // If we filtered everything out, return original results
  if (filtered.length === 0) {
    console.log('[RAG] Warning: All results were metadata, returning original')
    return results
  }
  
  console.log(`[RAG] Filtered out ${results.length - filtered.length} metadata/dictionary results`)
  return filtered
}

/**
 * Detect if query requires aggregation and adjust retrieval
 */
function detectAggregationNeeds(query: string): {
  needsAggregation: boolean
  aggregationType: 'sum' | 'average' | 'count' | 'max' | 'min' | 'group_by' | null
  groupByField: 'industry' | 'geography' | 'customer' | 'month' | null
} {
  const queryLower = query.toLowerCase()
  
  // Check for aggregation keywords
  const needsSum = /total|sum of|combined/i.test(query)
  const needsAverage = /average|mean|avg/i.test(query)
  const needsCount = /how many|count|number of/i.test(query)
  const needsMax = /highest|maximum|most|top|best/i.test(query)
  const needsMin = /lowest|minimum|least|worst/i.test(query)
  
  // Check for group by fields
  const groupByIndustry = /by industry|per industry|industry|industries/i.test(query)
  const groupByGeography = /by geography|by region|by country|geography|region/i.test(query)
  const groupByCustomer = /by customer|per customer|each customer/i.test(query)
  const groupByMonth = /by month|monthly|per month/i.test(query)
  
  let aggregationType: 'sum' | 'average' | 'count' | 'max' | 'min' | 'group_by' | null = null
  if (needsSum) aggregationType = 'sum'
  else if (needsAverage) aggregationType = 'average'
  else if (needsCount) aggregationType = 'count'
  else if (needsMax) aggregationType = 'max'
  else if (needsMin) aggregationType = 'min'
  else if (groupByIndustry || groupByGeography) aggregationType = 'group_by'
  
  let groupByField: 'industry' | 'geography' | 'customer' | 'month' | null = null
  if (groupByIndustry) groupByField = 'industry'
  else if (groupByGeography) groupByField = 'geography'
  else if (groupByCustomer) groupByField = 'customer'
  else if (groupByMonth) groupByField = 'month'
  
  const needsAggregation = aggregationType !== null
  
  if (needsAggregation) {
    console.log(`[RAG] Detected aggregation: ${aggregationType} by ${groupByField}`)
  }
  
  return {
    needsAggregation,
    aggregationType,
    groupByField
  }
}

/**
 * Extract specific identifiers from query and determine query type
 */
function extractKeywords(query: string): { 
  keywords: string[]
  type: 'exact_lookup' | 'general'
} {
  const keywords: string[] = []
  
  // Extract invoice numbers (INV-XXXXX pattern)
  const invoiceMatches = query.match(/INV-\d+/gi)
  if (invoiceMatches) {
    keywords.push(...invoiceMatches)
  }
  
  // Extract customer IDs (CUST-XXXX pattern)
  const customerMatches = query.match(/CUST-\d+/gi)
  if (customerMatches) {
    keywords.push(...customerMatches)
  }
  
  // Extract vendor IDs (VEND-XXXX pattern)
  const vendorMatches = query.match(/VEND-\d+/gi)
  if (vendorMatches) {
    keywords.push(...vendorMatches)
  }
  
  // Extract grant IDs (OPT-XXXX pattern)
  const grantMatches = query.match(/OPT-\d+/gi)
  if (grantMatches) {
    keywords.push(...grantMatches)
  }
  
  return {
    keywords,
    type: keywords.length > 0 ? 'exact_lookup' : 'general'
  }
}

/**
 * Prioritize exact matches - they should ALWAYS come first
 */
function prioritizeExactMatches(
  keywordResults: SearchResult[],
  vectorResults: SearchResult[],
  keywords: string[]
): SearchResult[] {
  if (keywordResults.length === 0) {
    return vectorResults
  }
  
  console.log(`[RAG] Prioritizing ${keywordResults.length} exact matches`)
  
  // Boost keyword results to top priority
  const boostedKeywordResults = keywordResults.map(result => ({
    ...result,
    similarity: 0.99, // Near-perfect score for exact matches
  }))
  
  // Remove duplicates from vector results
  const keywordIds = new Set(keywordResults.map(r => r.id))
  const uniqueVectorResults = vectorResults.filter(r => !keywordIds.has(r.id))
  
  // Exact matches first, then vector results
  return [...boostedKeywordResults, ...uniqueVectorResults]
}

/**
 * Intelligent context assembly - preserves complete records
 */
function assembleContext(
  results: SearchResult[],
  query: string,
  maxChars: number = 3500
): string {
  const { keywords, type } = extractKeywords(query)
  
  const chunks: string[] = []
  let currentLength = 0
  
  // For exact lookups, ensure the exact match is included first and completely
  if (type === 'exact_lookup') {
    // Find and include exact matches first
    for (const result of results) {
      const hasExactMatch = keywords.some(kw => 
        result.content.toUpperCase().includes(kw.toUpperCase())
      )
      
      if (hasExactMatch && currentLength + result.content.length < maxChars) {
        chunks.push(result.content)
        currentLength += result.content.length
        console.log(`[RAG] Added exact match chunk: ${result.content.substring(0, 100)}...`)
      }
    }
  }
  
  // Then add other relevant results
  for (const result of results) {
    // Skip if already added
    if (chunks.some(c => c === result.content)) continue
    
    if (currentLength + result.content.length < maxChars) {
      chunks.push(result.content)
      currentLength += result.content.length
    } else {
      break // Stop when we hit the limit
    }
  }
  
  console.log(`[RAG] Assembled context: ${currentLength} chars from ${chunks.length} chunks`)
  
  return chunks.join('\n\n')
}

/**
 * Main RAG pipeline - process a query and return an answer with sources
 * Matches Python: process_optimized_query()
 * @param prisma - Tenant-specific Prisma client for vector store operations
 */
export async function processQuery(
  prisma: TenantPrismaClient,
  query: string,
  options: {
    dataroomId?: string
    fileIds?: string[]
    topK?: number
  } = {}
): Promise<RAGResponse> {
  const startTime = Date.now()
  const { topK = 10 } = options

  console.log(`[RAG] Processing query: "${query.substring(0, 50)}..."`)

  try {
    // Step 1: Classify query
    const classification = await classifyQuery(query)
    console.log(`[RAG] Classification: ${classification.processingStrategy} (complexity: ${classification.complexity})`)

    // Step 2: Decompose if complex
    const subQueries = await decomposeQuery(query, classification.complexity)

    // Step 3: Extract keywords early for exact matching
    const { keywords, type: queryType } = extractKeywords(query)
    console.log(`[RAG] Query type: ${queryType}, Keywords: ${keywords.join(', ') || 'none'}`)

    // Step 3.5: Perform exact keyword search if keywords found
    let keywordResults: SearchResult[] = []
    if (keywords.length > 0) {
      keywordResults = await searchByKeyword(prisma, keywords, { limit: 5 })
      console.log(`[RAG] Keyword search returned ${keywordResults.length} exact matches`)
    }

    // Step 4: Get query embedding
    const embedding = await getQueryEmbedding(query)

    // Step 5: Search for relevant context
    let searchResults: SearchResult[]

    if (options.fileIds && options.fileIds.length > 0) {
      // Search in specific files
      searchResults = await searchByFiles(prisma, embedding, options.fileIds, { topK })
    } else {
      // Multi-file search with category prioritization
      searchResults = await searchMultiFile(prisma, embedding, classification.category, { topK })
    }

    console.log(`[RAG] Vector search found ${searchResults.length} relevant chunks`)

    // Step 5.5: Prioritize and merge keyword results with vector results
    if (keywordResults.length > 0) {
      searchResults = prioritizeExactMatches(keywordResults, searchResults, keywords)
      console.log(`[RAG] Prioritized ${keywordResults.length} exact matches`)
    }

    // Sort by similarity to prioritize most relevant chunks
    searchResults.sort((a, b) => b.similarity - a.similarity)

    // Step 5: Assemble context intelligently
    const context = assembleContext(searchResults, query, 3500)
    
    // Step 6: Generate answer with appropriate prompt
    let answer: string
    if (queryType === 'exact_lookup' && keywords.length > 0) {
      // Use exact lookup prompt for specific identifier queries
      const prompt = getExactLookupPrompt(context, query, keywords)
      const response = await getOpenAI().chat.completions.create({
        model: OPENAI_LLM_MODEL,
        messages: [
          { role: 'system', content: FINANCIAL_ASSISTANT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 512,
        temperature: 0,
      })
      answer = response.choices[0].message.content?.trim() || "I apologize, but I couldn't generate a response."
    } else {
      // Use standard prompt for general queries
      answer = await generateAnswer(query, [context])
    }

    // Step 6: Compile sources
    const sources = searchResults.map((result) => ({
      fileId: result.fileId,
      sourceFile: result.sourceFile,
      category: result.category,
      content: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
      similarity: result.similarity,
    }))

    const processingTime = Date.now() - startTime
    console.log(`[RAG] Query processed in ${processingTime}ms`)

    return {
      answer,
      sources,
      category: classification.category,
      subQueries: subQueries.length > 1 ? subQueries : undefined,
      processingTime,
    }
  } catch (error) {
    console.error('[RAG] Error processing query:', error)
    throw error
  }
}

/**
 * Streaming version of processQuery for real-time responses
 * @param prisma - Tenant-specific Prisma client for vector store operations
 */
export async function* processQueryStream(
  prisma: TenantPrismaClient,
  query: string,
  options: {
    dataroomId?: string
    fileIds?: string[]
    topK?: number
  } = {}
): AsyncGenerator<{ type: 'status' | 'chunk' | 'done'; data: string | RAGResponse }> {
  const startTime = Date.now()
  const { topK = 10 } = options

  try {
    yield { type: 'status', data: 'Analyzing query...' }

    // Step 1: Extract keywords and determine query type
    const { keywords, type: queryType } = extractKeywords(query)
    console.log(`[RAG Stream] Query type: ${queryType}, Keywords: ${keywords.join(', ') || 'none'}`)

    // Step 2: Enhanced category identification
    const categoryInfo = await identifyCategory(query)
    console.log(`[RAG Stream] Category: ${categoryInfo.primary}, Aggregation: ${categoryInfo.requiresAggregation}, Fallback: ${categoryInfo.fallback.join(', ') || 'none'}`)

    // Step 3: Detect aggregation needs
    const aggNeeds = detectAggregationNeeds(query)
    
    // Step 4: Keyword search for exact lookups
    let keywordResults: SearchResult[] = []
    if (keywords.length > 0) {
      keywordResults = await searchByKeyword(prisma, keywords, { limit: 5 })
      console.log(`[RAG Stream] Keyword search returned ${keywordResults.length} exact matches`)
    }

    // Step 5: Get embedding
    const embedding = await getQueryEmbedding(query)

    yield { type: 'status', data: 'Searching documents...' }

    // Step 6: Enhanced search with aggregation support and fallback
    let searchResults: SearchResult[]
    
    // Adjust topK for aggregation queries (need more data)
    const adjustedTopK = aggNeeds.needsAggregation || categoryInfo.requiresAggregation ? topK * 3 : topK
    console.log(`[RAG Stream] Adjusted topK: ${adjustedTopK} (aggregation: ${aggNeeds.needsAggregation})`)    

    if (options.fileIds && options.fileIds.length > 0) {
      searchResults = await searchByFiles(prisma, embedding, options.fileIds, { topK: adjustedTopK })
    } else {
      searchResults = await searchMultiFile(prisma, embedding, categoryInfo.primary, { topK: adjustedTopK })
    }

    console.log(`[RAG Stream] Initial search: ${searchResults.length} results`)

    // Filter out metadata/dictionary results
    searchResults = filterLowValueResults(searchResults)
    console.log(`[RAG Stream] After filtering: ${searchResults.length} results`)

    // If insufficient results and we have fallback categories, try them
    if (searchResults.length < 5 && categoryInfo.fallback.length > 0) {
      console.log(`[RAG Stream] Insufficient results, trying fallback categories: ${categoryInfo.fallback.join(', ')}`)
      
      for (const fallbackCategory of categoryInfo.fallback) {
        const fallbackResults = await searchMultiFile(prisma, embedding, fallbackCategory, { topK: 10 })
        const filteredFallback = filterLowValueResults(fallbackResults)
        
        // Merge without duplicates
        const existingIds = new Set(searchResults.map(r => r.id))
        const newResults = filteredFallback.filter(r => !existingIds.has(r.id))
        searchResults.push(...newResults)
        
        console.log(`[RAG Stream] Added ${newResults.length} from ${fallbackCategory}`)
        
        if (searchResults.length >= 10) break
      }
    }

    // Step 7: Prioritize and merge keyword results
    if (keywordResults.length > 0) {
      searchResults = prioritizeExactMatches(keywordResults, searchResults, keywords)
      console.log(`[RAG Stream] Prioritized ${keywordResults.length} exact matches`)
    }

    yield { type: 'status', data: `Found ${searchResults.length} relevant chunks. Generating answer...` }

    // Step 8: Sort search results by similarity
    searchResults.sort((a, b) => b.similarity - a.similarity)

    // Log search results for debugging
    console.log('[RAG Stream] Search results (sorted by similarity):')
    searchResults.slice(0, 5).forEach((r, i) => {
      console.log(`  [${i}] File: ${r.sourceFile}, Category: ${r.category}, Similarity: ${r.similarity.toFixed(3)}`)
      console.log(`      Content preview: ${r.content?.substring(0, 100)}...`)
    })

    // Step 9: Assemble context with larger limit for aggregation
    const contextLimit = aggNeeds.needsAggregation || categoryInfo.requiresAggregation ? 5000 : 3500
    const context = assembleContext(searchResults, query, contextLimit)
    
    if (!context || context.trim().length === 0) {
      yield { type: 'chunk', data: "I couldn't find any relevant information for that query in the available files." }
      yield {
        type: 'done',
        data: {
          answer: '',
          sources: [],
          category: categoryInfo.primary,
          processingTime: Date.now() - startTime,
        },
      }
      return
    }

    console.log('[RAG Stream] Context length:', context.length)
    console.log('[RAG Stream] Context preview:', context.substring(0, 300))
    
    // Step 10: Select appropriate prompt
    let prompt: string
    let promptType: string
    
    if (queryType === 'exact_lookup' && keywords.length > 0) {
      prompt = getExactLookupPrompt(context, query, keywords)
      promptType = 'exact_lookup'
    } else if (aggNeeds.needsAggregation) {
      prompt = getAggregationPrompt(context, query, aggNeeds.aggregationType!, aggNeeds.groupByField)
      promptType = `aggregation (${aggNeeds.aggregationType} by ${aggNeeds.groupByField})`
    } else {
      prompt = getBasicQAPrompt(context, query)
      promptType = 'general'
    }
    
    console.log('[RAG Stream] Prompt type:', promptType)
    console.log('[RAG Stream] Prompt length:', prompt.length)

    const stream = await getOpenAI().chat.completions.create({
      model: OPENAI_LLM_MODEL,
      messages: [
        { role: 'system', content: FINANCIAL_ASSISTANT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 512,
      temperature: 0,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield { type: 'chunk', data: content }
      }
    }

    // Final response with sources
    const sources = searchResults.map((result) => ({
      fileId: result.fileId,
      sourceFile: result.sourceFile,
      category: result.category,
      content: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
      similarity: result.similarity,
    }))

    yield {
      type: 'done',
      data: {
        answer: '', // Already streamed
        sources,
        category: categoryInfo.primary,
        processingTime: Date.now() - startTime,
      },
    }
  } catch (error) {
    console.error('[RAG] Streaming error:', error)
    throw error
  }
}

export { OPENAI_LLM_MODEL }
