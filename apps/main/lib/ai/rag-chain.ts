/**
 * RAG Chain Module
 * Orchestrates the Retrieval-Augmented Generation pipeline
 * Matches Python backend's client.py and optimized_query_processor.py functionality
 */

import OpenAI from 'openai'
import type { PrismaClient } from '@prisma/tenant-client'
import { getQueryEmbedding } from './embeddings'
import { searchMultiFile, searchByFiles, SearchResult } from './vector-store'
import {
  getFinancialCategoryPrompt,
  getBasicQAPrompt,
  getCombinedAnswerPrompt,
  getDecompositionPrompt,
  CATEGORY_KEYWORDS,
  FINANCIAL_ASSISTANT_SYSTEM_PROMPT,
} from './prompts'

// Type alias for tenant prisma client
type TenantPrismaClient = PrismaClient

const OPENAI_LLM_MODEL = process.env.OPENAI_LLM_MODEL || 'gpt-4o'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
 * Identify the category of a query using LLM
 * Matches Python: identify_category()
 */
export async function identifyCategory(query: string): Promise<string> {
  console.log(`[RAG] Identifying category for query: "${query.substring(0, 50)}..."`)

  try {
    const prompt = getFinancialCategoryPrompt(query)

    const response = await openai.chat.completions.create({
      model: OPENAI_LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 30,
      temperature: 0,
    })

    const category = response.choices[0].message.content?.trim() || 'Monthly Financials'

    // Validate the response
    if (category in CATEGORY_KEYWORDS) {
      console.log(`[RAG] Identified category: ${category}`)
      return category
    } else if (category === 'Unknown') {
      return 'Unknown'
    } else {
      console.warn(`[RAG] Invalid category '${category}', defaulting to Monthly Financials`)
      return 'Monthly Financials'
    }
  } catch (error) {
    console.error('[RAG] Error identifying category:', error)
    return 'Monthly Financials'
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
  const category = await identifyCategory(query)

  // Determine processing strategy
  let processingStrategy: 'simple' | 'moderate' | 'complex' = 'simple'
  if (complexity > 4) processingStrategy = 'complex'
  else if (complexity > 2) processingStrategy = 'moderate'

  // Check if can answer from metadata (e.g., "what files do you have?")
  const metadataQueries = /what files|list files|available documents|show me files/i
  const canAnswerFromMetadata = metadataQueries.test(query)

  return {
    category,
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

    const response = await openai.chat.completions.create({
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

    const response = await openai.chat.completions.create({
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

    // Step 3: Get query embedding
    const embedding = await getQueryEmbedding(query)

    // Step 4: Search for relevant context
    let searchResults: SearchResult[]

    if (options.fileIds && options.fileIds.length > 0) {
      // Search in specific files
      searchResults = await searchByFiles(prisma, embedding, options.fileIds, { topK })
    } else {
      // Multi-file search with category prioritization
      searchResults = await searchMultiFile(prisma, embedding, classification.category, { topK })
    }

    console.log(`[RAG] Found ${searchResults.length} relevant chunks`)

    // Sort by similarity to prioritize most relevant chunks
    searchResults.sort((a, b) => b.similarity - a.similarity)

    // Step 5: Generate answer
    const validContext = validateContext(searchResults)
    const answer = await generateAnswer(query, validContext)

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

    // Classify and get embedding
    const classification = await classifyQuery(query)
    const embedding = await getQueryEmbedding(query)

    yield { type: 'status', data: 'Searching documents...' }

    // Search for context
    let searchResults: SearchResult[]
    if (options.fileIds && options.fileIds.length > 0) {
      searchResults = await searchByFiles(prisma, embedding, options.fileIds, { topK })
    } else {
      searchResults = await searchMultiFile(prisma, embedding, classification.category, { topK })
    }

    yield { type: 'status', data: `Found ${searchResults.length} relevant chunks. Generating answer...` }

    // Sort search results by similarity (highest first) to prioritize most relevant chunks
    searchResults.sort((a, b) => b.similarity - a.similarity)

    // Log search results for debugging
    console.log('[RAG Stream] Search results (sorted by similarity):')
    searchResults.forEach((r, i) => {
      console.log(`  [${i}] File: ${r.sourceFile}, Category: ${r.category}, Similarity: ${r.similarity.toFixed(3)}`)
      console.log(`      Content preview: ${r.content?.substring(0, 100)}...`)
    })

    // Generate answer with streaming
    const validContext = validateContext(searchResults)
    console.log('[RAG Stream] Valid context chunks:', validContext.length)

    if (validContext.length === 0) {
      console.warn('[RAG Stream] No valid context found!')
      yield { type: 'chunk', data: "I might not have the files containing that information." }
    } else {
      const context = validContext.join('\n').substring(0, 3000)
      console.log('[RAG Stream] Context length:', context.length)
      console.log('[RAG Stream] Context preview:', context.substring(0, 500))
      const prompt = getBasicQAPrompt(context, query)
      console.log('[RAG Stream] Prompt length:', prompt.length)

      const stream = await openai.chat.completions.create({
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
        category: classification.category,
        processingTime: Date.now() - startTime,
      },
    }
  } catch (error) {
    console.error('[RAG] Streaming error:', error)
    throw error
  }
}

export { OPENAI_LLM_MODEL }
