/**
 * Text Chunker for RAG
 * Matches Python backend's chunk_text_with_overlap logic exactly
 */

import { TextChunk, ChunkMetadata } from './types'

export interface ChunkingOptions {
  chunkSize?: number           // Target chunk size in characters (default: 1000)
  overlapPercentage?: number   // Overlap percentage (default: 0.1 = 10%)
}

const DEFAULT_CHUNK_SIZE = 1000
const DEFAULT_OVERLAP_PERCENTAGE = 0.1

/**
 * Split text into chunks with specified overlap percentage.
 * Matches Python: chunk_text_with_overlap()
 *
 * @param text - The text to chunk
 * @param chunkSize - Maximum size of each chunk in characters
 * @param overlapPercentage - Percentage of overlap between chunks (0.1 for 10%)
 * @returns List of text chunks with overlap
 */
export function chunkTextWithOverlap(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlapPercentage: number = DEFAULT_OVERLAP_PERCENTAGE
): string[] {
  if (!text || text.length <= chunkSize) {
    return text ? [text] : []
  }

  const chunks: string[] = []
  const overlapSize = Math.floor(chunkSize * overlapPercentage)
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length)

    // If this is not the last chunk, try to end at a sentence boundary
    if (end < text.length) {
      const sentenceEnds = ['.', '!', '?', '\n']
      let bestEnd = end

      // Look back up to 100 characters for a good break point
      const lookBackLimit = Math.max(start + Math.floor(chunkSize / 2), end - 100)
      for (let i = end; i > lookBackLimit; i--) {
        if (i < text.length && sentenceEnds.includes(text[i])) {
          bestEnd = i + 1
          break
        }
      }
      end = bestEnd
    }

    const chunk = text.substring(start, end).trim()
    if (chunk) {
      chunks.push(chunk)
    }

    // Move start position with overlap, but ensure progress
    let nextStart = end - overlapSize

    // Ensure we always make progress
    if (nextStart <= start) {
      nextStart = start + Math.max(1, chunkSize - overlapSize)
    }

    start = nextStart

    // Safety check to avoid infinite loop
    if (start >= text.length) {
      break
    }
  }

  return chunks
}

/**
 * Chunk text and return with metadata
 */
export function chunkText(
  text: string,
  source: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    overlapPercentage = DEFAULT_OVERLAP_PERCENTAGE,
  } = options

  const textChunks = chunkTextWithOverlap(text, chunkSize, overlapPercentage)

  return textChunks.map((content, index) => ({
    content,
    metadata: {
      source,
      chunkIndex: index,
      totalChunks: textChunks.length,
    },
  }))
}

/**
 * Chunk Excel data with sheet context
 * Each row becomes its own record for embedding (matches Python behavior)
 */
export function chunkExcelData(
  text: string,
  source: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const chunks: TextChunk[] = []
  const sheetSections = text.split(/===\s*Sheet:\s*(.+?)\s*===/)

  let chunkIndex = 0

  for (let i = 1; i < sheetSections.length; i += 2) {
    const currentSheet = sheetSections[i]
    const sheetContent = sheetSections[i + 1] || ''

    // Split sheet content into rows
    const rows = sheetContent.trim().split('\n').filter(Boolean)

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex].trim()
      if (row) {
        chunks.push({
          content: row,
          metadata: {
            source,
            chunkIndex,
            totalChunks: 0, // Will be updated
            sheetName: currentSheet,
            rowNumber: rowIndex + 1,
          },
        })
        chunkIndex++
      }
    }
  }

  // Update total chunks
  chunks.forEach(chunk => {
    chunk.metadata.totalChunks = chunks.length
  })

  return chunks
}

/**
 * Chunk PDF data with page context
 */
export function chunkPdfWithPages(
  pages: Array<{ pageNumber: number; text: string }>,
  source: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const allChunks: TextChunk[] = []
  let globalChunkIndex = 0

  for (const page of pages) {
    const pageChunks = chunkTextWithOverlap(
      page.text,
      options.chunkSize || DEFAULT_CHUNK_SIZE,
      options.overlapPercentage || DEFAULT_OVERLAP_PERCENTAGE
    )

    for (const chunkContent of pageChunks) {
      allChunks.push({
        content: chunkContent,
        metadata: {
          source,
          chunkIndex: globalChunkIndex,
          totalChunks: 0, // Will be updated
          pageNumber: page.pageNumber,
        },
      })
      globalChunkIndex++
    }
  }

  // Update total chunks
  allChunks.forEach(chunk => {
    chunk.metadata.totalChunks = allChunks.length
  })

  return allChunks
}
