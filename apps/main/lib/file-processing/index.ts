/**
 * File Processing Module
 * Unified text extraction and processing for RAG pipeline
 * Matches Python backend functionality
 */

// Note: pdf-extractor uses dynamic import internally to avoid DOMMatrix issues
import { extractTextFromExcel, extractTextFromCsv } from './excel-extractor'
import { extractTextFromDocx, extractTextFromTxt } from './word-extractor'
import { getCategory, generateFileDescription } from './category-classifier'
import { FinancialCategory, EmbeddingRecord } from './types'
import { v4 as uuidv4 } from 'uuid'

export * from './types'
export * from './text-chunker'
export * from './excel-extractor'
export * from './word-extractor'
export * from './category-classifier'

// PDF extractor function - dynamically loads pdf-parse internally
async function extractTextFromPdf(buffer: Buffer): Promise<string[]> {
  const { extractTextFromPdf: pdfExtract } = await import('./pdf-extractor')
  return pdfExtract(buffer)
}

/**
 * Extract text from various file types and return chunked text.
 * Matches Python: extract_text_by_file_type()
 *
 * Supported file types:
 * - PDF (.pdf)
 * - Word Documents (.docx)
 * - Text files (.txt)
 * - Excel files (.xlsx, .xls)
 * - CSV files (.csv)
 *
 * @param buffer - File buffer
 * @param filename - Original filename (used to determine file type)
 * @returns Array of text chunks with 10% overlap
 */
export async function extractTextByFileType(buffer: Buffer, filename: string): Promise<string[]> {
  const fileExtension = filename.split('.').pop()?.toLowerCase()

  console.log(`[File Processing] Extracting text from ${filename} (type: ${fileExtension})`)

  try {
    switch (fileExtension) {
      case 'pdf':
        return await extractTextFromPdf(buffer)

      case 'docx':
        return await extractTextFromDocx(buffer)

      case 'txt':
        return extractTextFromTxt(buffer)

      case 'xlsx':
      case 'xls':
        return extractTextFromExcel(buffer)

      case 'csv':
        return extractTextFromCsv(buffer)

      default:
        throw new Error(`Unsupported file type: ${fileExtension}`)
    }
  } catch (error) {
    console.error(`[File Processing] Error extracting text from ${filename}:`, error)
    throw error
  }
}

export interface ProcessFileOptions {
  fileId?: string
  generateDescription?: boolean
}

export interface ProcessedFile {
  chunks: string[]
  category: FinancialCategory | 'Unknown'
  description?: string
  records: EmbeddingRecord[]
  metadata: {
    filename: string
    fileType: string
    chunkCount: number
    category: string
  }
}

/**
 * Process a file for RAG pipeline.
 * Extracts text, classifies category, and prepares records for embedding.
 *
 * @param buffer - File buffer
 * @param filename - Original filename
 * @param options - Processing options
 * @returns Processed file with chunks and metadata
 */
export async function processFileForRAG(
  buffer: Buffer,
  filename: string,
  options: ProcessFileOptions = {}
): Promise<ProcessedFile> {
  const { fileId, generateDescription: shouldGenerateDescription = false } = options
  const fileExtension = filename.split('.').pop()?.toLowerCase() || ''

  console.log(`[File Processing] Processing ${filename} for RAG pipeline`)

  // Extract text chunks
  const chunks = await extractTextByFileType(buffer, filename)

  if (chunks.length === 0) {
    console.warn(`[File Processing] No text extracted from ${filename}`)
  }

  // Get category
  const category = await getCategory(filename, buffer)
  console.log(`[File Processing] Category: ${category}`)

  // Generate description if requested
  let description: string | undefined
  if (shouldGenerateDescription && chunks.length > 0) {
    description = await generateFileDescription(filename, chunks)
  }

  // Prepare records for embedding
  const records: EmbeddingRecord[] = chunks.map((text, index) => ({
    pointId: uuidv4(),
    fileId,
    text,
    category,
    sourceFile: filename,
    rowNumber: index + 1,
    metadata: {
      category,
      sourceFile: filename,
      chunkIndex: index,
      totalChunks: chunks.length,
    },
  }))

  return {
    chunks,
    category,
    description,
    records,
    metadata: {
      filename,
      fileType: fileExtension,
      chunkCount: chunks.length,
      category,
    },
  }
}

/**
 * Ingest multiple files and return records ready for embedding.
 * Matches Python: ingest_all_excels() pattern but for all file types.
 *
 * @param files - Array of file objects with buffer and filename
 * @returns Array of embedding records
 */
export async function ingestFiles(
  files: Array<{ buffer: Buffer; filename: string; fileId?: string }>
): Promise<EmbeddingRecord[]> {
  console.log(`[File Processing] Starting ingestion of ${files.length} files`)

  const allRecords: EmbeddingRecord[] = []

  for (const file of files) {
    try {
      const processed = await processFileForRAG(file.buffer, file.filename, {
        fileId: file.fileId,
      })
      allRecords.push(...processed.records)
      console.log(`[File Processing] Ingested ${file.filename}: ${processed.records.length} records`)
    } catch (error) {
      console.error(`[File Processing] Error processing ${file.filename}:`, error)
      // Continue with other files
    }
  }

  console.log(`[File Processing] Ingestion complete. Total records: ${allRecords.length}`)
  return allRecords
}
