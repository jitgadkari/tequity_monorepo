/**
 * Word Document Text Extractor
 * Matches Python backend's extract_text_from_docx logic
 * Uses mammoth to extract text content from .docx files
 */

import mammoth from 'mammoth'
import { chunkTextWithOverlap } from './text-chunker'

/**
 * Extract text from DOCX file and return chunked text.
 * Matches Python: extract_text_from_docx()
 *
 * @param buffer - Word document buffer
 * @returns Array of text chunks with 10% overlap
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string[]> {
  console.log('[Word Extractor] Extracting text from DOCX')

  try {
    // Extract as plain text (cleaner for RAG, matches Python)
    const result = await mammoth.extractRawText({ buffer })

    const textContent = result.value.trim()

    // Log any conversion warnings
    if (result.messages.length > 0) {
      console.log('[Word Extractor] Warnings:', result.messages)
    }

    if (!textContent) {
      console.warn('[Word Extractor] No text extracted from DOCX')
      return []
    }

    // Chunk the text with 10% overlap (matching Python)
    const chunks = chunkTextWithOverlap(textContent, 1000, 0.1)
    console.log(`[Word Extractor] Extracted ${chunks.length} chunks from DOCX`)

    return chunks
  } catch (error) {
    console.error('[Word Extractor] Error:', error)
    throw new Error(`Failed to extract DOCX content: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract text from TXT file and return chunked text.
 * Matches Python: extract_text_from_txt()
 *
 * @param buffer - Text file buffer
 * @returns Array of text chunks with 10% overlap
 */
export function extractTextFromTxt(buffer: Buffer): string[] {
  console.log('[Text Extractor] Extracting text from TXT')

  try {
    // Try different encodings (matching Python)
    const encodings: BufferEncoding[] = ['utf-8', 'utf16le', 'latin1']
    let textContent: string | null = null

    for (const encoding of encodings) {
      try {
        textContent = buffer.toString(encoding)
        // Check if decoded properly (no replacement characters)
        if (!textContent.includes('\uFFFD')) {
          console.log(`[Text Extractor] Successfully read with ${encoding} encoding`)
          break
        }
      } catch {
        continue
      }
    }

    if (!textContent || !textContent.trim()) {
      console.warn('[Text Extractor] No text content in file')
      return []
    }

    // Chunk the text with 10% overlap (matching Python)
    const chunks = chunkTextWithOverlap(textContent, 1000, 0.1)
    console.log(`[Text Extractor] Extracted ${chunks.length} chunks from TXT`)

    return chunks
  } catch (error) {
    console.error('[Text Extractor] Error:', error)
    throw new Error(`Failed to extract TXT content: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
