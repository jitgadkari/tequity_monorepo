/**
 * Vector Store Module - pgvector operations
 * Matches Python backend's pgvector_upsert.py functionality
 * Uses raw SQL for vector operations since Prisma doesn't natively support pgvector
 */

import { PrismaClient, Prisma } from '@prisma/client'

const VECTOR_SIZE = 1536 // OpenAI ada-002 embedding dimension
const DEFAULT_TABLE = 'DocumentEmbedding'

// Use a separate Prisma client for raw queries
const prisma = new PrismaClient()

export interface VectorRecord {
  pointId: string
  fileId?: string
  content: string
  embedding: number[]
  metadata?: {
    category?: string
    sourceFile?: string
    rowNumber?: number
    sheetName?: string
    chunkIndex?: number
    totalChunks?: number
  }
}

export interface SearchResult {
  id: string
  pointId: string
  content: string
  text: string // alias for content
  fileId?: string
  category?: string
  sourceFile?: string
  rowNumber?: number
  sheetName?: string
  similarity: number
  distance: number
}

/**
 * Initialize pgvector extension and ensure table has vector column
 * Should be run once during setup
 */
export async function initVectorStore(): Promise<void> {
  console.log('[VectorStore] Initializing pgvector...')

  try {
    // Enable pgvector extension
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`

    // Check if embedding column exists
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'DocumentEmbedding'
      AND column_name = 'embedding'
    `

    if (result.length === 0) {
      // Add embedding column if it doesn't exist
      await prisma.$executeRaw`
        ALTER TABLE "DocumentEmbedding"
        ADD COLUMN IF NOT EXISTS embedding vector(1536)
      `
      console.log('[VectorStore] Added embedding column to DocumentEmbedding table')
    }

    // Create index for cosine similarity search
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS document_embedding_vector_idx
      ON "DocumentEmbedding"
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `

    console.log('[VectorStore] pgvector initialized successfully')
  } catch (error) {
    console.error('[VectorStore] Error initializing:', error)
    throw error
  }
}

/**
 * Upsert embeddings into the DocumentEmbedding table
 * Matches Python: upsert_embeddings()
 */
export async function upsertEmbeddings(
  records: VectorRecord[],
  fileId: string
): Promise<number> {
  if (!records || records.length === 0) {
    console.warn('[VectorStore] No records to upsert')
    return 0
  }

  console.log(`[VectorStore] Upserting ${records.length} embeddings for file ${fileId}`)

  let upsertedCount = 0

  // Process in batches of 100 to avoid memory issues
  const batchSize = 100
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    for (const record of batch) {
      try {
        if (!record.embedding || record.embedding.length !== VECTOR_SIZE) {
          console.warn(`[VectorStore] Invalid embedding for record ${record.pointId}`)
          continue
        }

        // Convert embedding array to PostgreSQL vector format
        const embeddingStr = `[${record.embedding.join(',')}]`

        // Check if record exists
        const existing = await prisma.documentEmbedding.findFirst({
          where: {
            fileId,
            chunkIndex: record.metadata?.chunkIndex || 0,
          },
        })

        if (existing) {
          // Update existing record with embedding
          await prisma.$executeRaw`
            UPDATE "DocumentEmbedding"
            SET
              content = ${record.content},
              metadata = ${record.metadata ? JSON.stringify(record.metadata) : null}::jsonb,
              embedding = ${embeddingStr}::vector
            WHERE id = ${existing.id}
          `
        } else {
          // Insert new record with embedding
          await prisma.$executeRaw`
            INSERT INTO "DocumentEmbedding" (id, "fileId", "chunkIndex", content, metadata, "createdAt", embedding)
            VALUES (
              ${record.pointId},
              ${fileId},
              ${record.metadata?.chunkIndex || 0},
              ${record.content},
              ${record.metadata ? JSON.stringify(record.metadata) : null}::jsonb,
              NOW(),
              ${embeddingStr}::vector
            )
            ON CONFLICT (id) DO UPDATE SET
              content = EXCLUDED.content,
              metadata = EXCLUDED.metadata,
              embedding = EXCLUDED.embedding
          `
        }

        upsertedCount++
      } catch (error) {
        console.error(`[VectorStore] Error upserting record:`, error)
      }
    }

    console.log(`[VectorStore] Upserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`)
  }

  console.log(`[VectorStore] Total upserted: ${upsertedCount} embeddings`)
  return upsertedCount
}

/**
 * Search for similar embeddings using cosine similarity
 * Matches Python: search_similar()
 */
export async function searchSimilar(
  queryEmbedding: number[],
  options: {
    limit?: number
    categoryFilter?: string
    fileIds?: string[]
    similarityThreshold?: number
  } = {}
): Promise<SearchResult[]> {
  const { limit = 10, categoryFilter, fileIds, similarityThreshold = 0.3 } = options

  console.log('[VectorStore] Searching similar embeddings...')

  try {
    // Convert embedding to PostgreSQL vector format
    const embeddingStr = `[${queryEmbedding.join(',')}]`

    // Build dynamic query based on filters
    let whereClause = `WHERE 1=1`
    const params: unknown[] = [embeddingStr, embeddingStr]

    if (categoryFilter) {
      whereClause += ` AND metadata->>'category' = $3`
      params.push(categoryFilter)
    }

    if (fileIds && fileIds.length > 0) {
      const fileIdPlaceholders = fileIds.map((_, idx) => `$${params.length + idx + 1}`).join(',')
      whereClause += ` AND "fileId" IN (${fileIdPlaceholders})`
      params.push(...fileIds)
    }

    // Use raw query for vector similarity search
    const results = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        fileId: string | null
        content: string
        metadata: Prisma.JsonValue
        distance: number
      }>
    >(
      `
      SELECT
        id,
        "fileId" as "fileId",
        content,
        metadata,
        (embedding <=> $1::vector) as distance
      FROM "DocumentEmbedding"
      ${whereClause}
      AND (embedding <=> $2::vector) <= ${1 - similarityThreshold}
      ORDER BY embedding <=> $1::vector
      LIMIT ${limit}
    `,
      ...params
    )

    // Map results to SearchResult format
    return results.map((row) => {
      const metadata = (row.metadata as Record<string, unknown>) || {}
      return {
        id: row.id,
        pointId: row.id,
        content: row.content,
        text: row.content, // alias
        fileId: row.fileId || undefined,
        category: metadata.category as string | undefined,
        sourceFile: metadata.sourceFile as string | undefined,
        rowNumber: metadata.rowNumber as number | undefined,
        sheetName: metadata.sheetName as string | undefined,
        similarity: 1 - row.distance,
        distance: row.distance,
      }
    })
  } catch (error) {
    console.error('[VectorStore] Search error:', error)
    throw error
  }
}

/**
 * Multi-file search with category prioritization
 * Matches Python: search_pgvector() with multi_file_search
 */
export async function searchMultiFile(
  queryEmbedding: number[],
  category: string,
  options: {
    topK?: number
    similarityThreshold?: number
  } = {}
): Promise<SearchResult[]> {
  const { topK = 10, similarityThreshold = 0.3 } = options

  console.log(`[VectorStore] Multi-file search with category: ${category}`)

  try {
    const embeddingStr = `[${queryEmbedding.join(',')}]`
    const maxDistance = 1 - similarityThreshold

    // Single CTE query combining category + cross-category search
    // Matches Python's optimized search_pgvector function
    const results = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        fileId: string | null
        content: string
        metadata: Prisma.JsonValue
        distance: number
        search_priority: number
        relevance_type: string
      }>
    >(
      `
      WITH category_search AS (
        SELECT
          id,
          "fileId",
          content,
          metadata,
          (embedding <=> $1::vector) as distance,
          1 as search_priority,
          'category_match' as relevance_type
        FROM "DocumentEmbedding"
        WHERE metadata->>'category' = $2
        AND (embedding <=> $1::vector) <= $3
        ORDER BY embedding <=> $1::vector
        LIMIT $4
      ),
      cross_search AS (
        SELECT
          id,
          "fileId",
          content,
          metadata,
          (embedding <=> $1::vector) as distance,
          2 as search_priority,
          'cross_category' as relevance_type
        FROM "DocumentEmbedding"
        WHERE (embedding <=> $1::vector) <= $3
        ORDER BY embedding <=> $1::vector
        LIMIT $5
      )
      SELECT DISTINCT ON (substring(content, 1, 100))
        id,
        "fileId",
        content,
        metadata,
        distance,
        search_priority,
        relevance_type
      FROM (
        SELECT * FROM category_search
        UNION ALL
        SELECT * FROM cross_search
      ) combined
      ORDER BY substring(content, 1, 100), search_priority, distance
      LIMIT $6
    `,
      embeddingStr,
      category,
      maxDistance,
      Math.floor(topK / 2),
      topK,
      topK
    )

    // Map results
    const mapped: SearchResult[] = results.map((row) => {
      const metadata = (row.metadata as Record<string, unknown>) || {}
      return {
        id: row.id,
        pointId: row.id,
        content: row.content,
        text: row.content,
        fileId: row.fileId || undefined,
        category: metadata.category as string | undefined,
        sourceFile: metadata.sourceFile as string | undefined,
        rowNumber: metadata.rowNumber as number | undefined,
        sheetName: metadata.sheetName as string | undefined,
        similarity: 1 - row.distance,
        distance: row.distance,
      }
    })

    // Add diversity scoring based on source files
    const sourceFiles = new Set<string>()
    mapped.forEach((result) => {
      if (result.sourceFile) {
        sourceFiles.add(result.sourceFile)
      }
    })

    console.log(`[VectorStore] Search returned ${mapped.length} chunks from ${sourceFiles.size} files`)
    return mapped
  } catch (error) {
    console.error('[VectorStore] Multi-file search error:', error)
    throw error
  }
}

/**
 * Search within specific files only
 * Matches Python: search_pgvector_by_files()
 */
export async function searchByFiles(
  queryEmbedding: number[],
  fileIds: string[],
  options: {
    topK?: number
    similarityThreshold?: number
  } = {}
): Promise<SearchResult[]> {
  if (!fileIds || fileIds.length === 0) {
    console.warn('[VectorStore] No file IDs provided for targeted search')
    return []
  }

  const { topK = 10, similarityThreshold = 0.2 } = options

  console.log(`[VectorStore] Searching in ${fileIds.length} specific files`)

  try {
    const embeddingStr = `[${queryEmbedding.join(',')}]`
    const maxDistance = 1 - similarityThreshold

    // Build file ID placeholders
    const fileIdPlaceholders = fileIds.map((_, idx) => `$${idx + 3}`).join(',')

    const results = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        fileId: string | null
        content: string
        metadata: Prisma.JsonValue
        distance: number
      }>
    >(
      `
      SELECT
        id,
        "fileId",
        content,
        metadata,
        (embedding <=> $1::vector) as distance
      FROM "DocumentEmbedding"
      WHERE "fileId" IN (${fileIdPlaceholders})
      AND (embedding <=> $1::vector) <= $2
      ORDER BY embedding <=> $1::vector
      LIMIT ${topK}
    `,
      embeddingStr,
      maxDistance,
      ...fileIds
    )

    console.log(`[VectorStore] Targeted file search: ${results.length} chunks from ${fileIds.length} files`)

    return results.map((row) => {
      const metadata = (row.metadata as Record<string, unknown>) || {}
      return {
        id: row.id,
        pointId: row.id,
        content: row.content,
        text: row.content,
        fileId: row.fileId || undefined,
        category: metadata.category as string | undefined,
        sourceFile: metadata.sourceFile as string | undefined,
        rowNumber: metadata.rowNumber as number | undefined,
        sheetName: metadata.sheetName as string | undefined,
        similarity: 1 - row.distance,
        distance: row.distance,
      }
    })
  } catch (error) {
    console.error('[VectorStore] Search by files error:', error)
    throw error
  }
}

/**
 * Delete embeddings by file ID
 */
export async function deleteByFileId(fileId: string): Promise<number> {
  console.log(`[VectorStore] Deleting embeddings for file ${fileId}`)

  const result = await prisma.documentEmbedding.deleteMany({
    where: { fileId },
  })

  console.log(`[VectorStore] Deleted ${result.count} embeddings`)
  return result.count
}

/**
 * Delete embeddings by source file name
 * Matches Python: delete_by_source()
 */
export async function deleteBySource(sourceFile: string): Promise<number> {
  console.log(`[VectorStore] Deleting embeddings for source: ${sourceFile}`)

  const result = await prisma.$executeRaw`
    DELETE FROM "DocumentEmbedding"
    WHERE metadata->>'sourceFile' = ${sourceFile}
  `

  console.log(`[VectorStore] Deleted ${result} embeddings`)
  return result as number
}

/**
 * Get embedding count for a file
 */
export async function getEmbeddingCount(fileId: string): Promise<number> {
  const count = await prisma.documentEmbedding.count({
    where: { fileId },
  })
  return count
}

export { VECTOR_SIZE }
