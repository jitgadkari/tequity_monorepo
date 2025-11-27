/**
 * PDF Text Extractor
 * Matches Python backend's extract_text_from_pdf logic
 * Uses pdf-parse to extract text content from PDF files
 */

import { chunkTextWithOverlap } from './text-chunker'

/**
 * Extract text from PDF file and return chunked text.
 * Matches Python: extract_text_from_pdf()
 *
 * @param buffer - PDF file buffer
 * @returns Array of text chunks with 10% overlap
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string[]> {
  console.log('[PDF Extractor] Extracting text from PDF')

  try {
    // Dynamic import to avoid DOMMatrix error on module initialization
    // pdf-parse has browser dependencies that cause issues when loaded at module level
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)

    let textContent = ''

    // Extract text with page markers (like Python backend)
    // pdf-parse gives us the full text, but we can also access page info
    if (data.text && data.text.trim()) {
      // Add page markers by splitting on form feeds or multiple newlines
      const pageTexts: string[] = data.text.split(/\f/)

      pageTexts.forEach((pageText: string, pageNum: number) => {
        const trimmedText = pageText.trim()
        if (trimmedText) {
          textContent += `\n--- Page ${pageNum + 1} ---\n${trimmedText}\n`
        }
      })
    }

    if (!textContent.trim()) {
      console.warn('[PDF Extractor] No text extracted from PDF')
      return []
    }

    // Chunk the text with 10% overlap (matching Python)
    const chunks = chunkTextWithOverlap(textContent, 1000, 0.1)
    console.log(`[PDF Extractor] Extracted ${chunks.length} chunks from PDF`)

    return chunks
  } catch (error) {
    console.error('[PDF Extractor] Error:', error)
    throw new Error(`Failed to extract PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get PDF metadata and page count
 */
export async function getPdfInfo(buffer: Buffer): Promise<{
  pageCount: number
  wordCount: number
  charCount: number
}> {
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(buffer)
  const text = data.text || ''

  return {
    pageCount: data.numpages,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    charCount: text.length,
  }
}
