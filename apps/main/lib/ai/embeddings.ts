/**
 * OpenAI Embeddings Module
 * Matches Python backend's embedding.py functionality
 * Uses batch processing for 15-30x speed improvement
 */

import OpenAI from 'openai'

// OpenAI API limits: max 2048 inputs per batch, 8191 tokens per input for ada-002
const MAX_BATCH_SIZE = 2048
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002'
const EMBEDDING_DIMENSIONS = 1536 // ada-002 dimension

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface EmbeddingRecord {
  pointId: string
  fileId?: string
  text: string
  embedding?: number[]
  category?: string
  sourceFile?: string
  rowNumber?: number
  metadata?: Record<string, unknown>
}

/**
 * Get embedding for a single text (kept for backward compatibility)
 */
export async function getEmbedding(text: string, model: string = EMBEDDING_MODEL): Promise<number[]> {
  const response = await openai.embeddings.create({
    input: [text],
    model,
  })
  return response.data[0].embedding
}

/**
 * Embed multiple records efficiently using batch processing.
 * Processes up to 2048 texts per API call for 15-30x speed improvement.
 * Matches Python: embed_records()
 */
export async function embedRecords(records: EmbeddingRecord[]): Promise<EmbeddingRecord[]> {
  if (!records || records.length === 0) {
    return []
  }

  const totalRecords = records.length
  console.log(`[Embeddings] Starting batch embedding for ${totalRecords} records`)

  // Extract all texts
  const texts = records.map((rec) => rec.text || '')

  // Filter out empty texts but keep track of indices
  const validIndices: number[] = []
  const validTexts: string[] = []

  texts.forEach((text, i) => {
    if (text && text.trim()) {
      validIndices.push(i)
      validTexts.push(text)
    }
  })

  if (validTexts.length === 0) {
    console.warn('[Embeddings] No valid texts to embed')
    return records
  }

  const allEmbeddings: number[][] = []

  // Process in batches if we have more than MAX_BATCH_SIZE records
  for (let batchStart = 0; batchStart < validTexts.length; batchStart += MAX_BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + MAX_BATCH_SIZE, validTexts.length)
    const batchTexts = validTexts.slice(batchStart, batchEnd)
    const batchSize = batchTexts.length
    const batchNumber = Math.floor(batchStart / MAX_BATCH_SIZE) + 1

    console.log(`[Embeddings] Processing batch ${batchNumber}: ${batchSize} texts`)

    try {
      // Make single API call for entire batch
      const response = await openai.embeddings.create({
        input: batchTexts,
        model: EMBEDDING_MODEL,
      })

      // Extract embeddings from response
      const batchEmbeddings = response.data.map((d) => d.embedding)
      allEmbeddings.push(...batchEmbeddings)

      console.log(`[Embeddings] Successfully embedded batch of ${batchSize} texts`)
    } catch (error) {
      console.error(`[Embeddings] Error embedding batch ${batchStart}-${batchEnd}:`, error)
      // Fallback to individual embedding for this batch
      console.log('[Embeddings] Falling back to individual embedding for failed batch')

      for (const text of batchTexts) {
        try {
          const emb = await getEmbedding(text)
          allEmbeddings.push(emb)
        } catch (innerError) {
          console.error('[Embeddings] Failed to embed text:', innerError)
          // Use zero vector as fallback
          allEmbeddings.push(new Array(EMBEDDING_DIMENSIONS).fill(0))
        }
      }
    }
  }

  // Assign embeddings back to records
  let embeddingIdx = 0
  for (const i of validIndices) {
    if (embeddingIdx < allEmbeddings.length) {
      records[i].embedding = allEmbeddings[embeddingIdx]
      embeddingIdx++
    }
  }

  console.log(`[Embeddings] Completed embedding for ${totalRecords} records (batch processing)`)
  return records
}

/**
 * Get query embedding with caching potential
 * Matches Python: get_query_embedding()
 */
export async function getQueryEmbedding(query: string): Promise<number[]> {
  try {
    const embedding = await getEmbedding(query)
    console.log(`[Embeddings] Generated embedding for query (${embedding.length} dimensions)`)
    return embedding
  } catch (error) {
    console.error('[Embeddings] Error getting query embedding:', error)
    throw error
  }
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS }
