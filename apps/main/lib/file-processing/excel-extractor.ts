/**
 * Excel/CSV Text Extractor
 * Matches Python backend's extract_text_from_excel logic
 * Uses xlsx to extract text content from spreadsheet files
 */

import * as XLSX from 'xlsx'
import { SheetInfo } from './types'

export interface ExcelExtractionOptions {
  maxRowsPerSheet?: number
  timeout?: number
}

/**
 * Extract text from Excel file - each row becomes a separate record.
 * Matches Python: extract_text_from_excel()
 *
 * @param buffer - Excel file buffer
 * @returns Array of row strings (each row is: "Sheet: {name} | col1: val1, col2: val2, ...")
 */
export function extractTextFromExcel(buffer: Buffer, options: ExcelExtractionOptions = {}): string[] {
  const { maxRowsPerSheet = 10000 } = options
  console.log('[Excel Extractor] Reading Excel file')

  try {
    // Try with different read options for better compatibility
    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellNF: false, cellText: false })
    } catch (firstError) {
      console.warn('[Excel Extractor] First read attempt failed, trying with raw option:', firstError)
      // Fallback: try with raw option for corrupted files
      workbook = XLSX.read(buffer, { type: 'buffer', raw: true })
    }
    
    console.log(`[Excel Extractor] Loaded ${workbook.SheetNames.length} sheets`)

    const texts: string[] = []

    for (const sheetName of workbook.SheetNames) {
      try {
        const worksheet = workbook.Sheets[sheetName]
        const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null

        if (!range) {
          console.warn(`[Excel Extractor] No range found for sheet: ${sheetName}`)
          continue
        }

        // Convert to JSON for row extraction
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: '',
          range: {
            s: range.s,
            e: {
              r: Math.min(range.e.r, range.s.r + maxRowsPerSheet - 1),
              c: range.e.c,
            },
          },
        })

        console.log(`[Excel Extractor] Processing sheet: ${sheetName} with ${jsonData.length} rows`)

        let rowCount = 0
        for (const row of jsonData) {
          // Format: "Sheet: {name} | col1: val1, col2: val2, ..."
          // Matches Python format exactly
          const rowStr = `Sheet: ${sheetName} | ` +
            Object.entries(row)
              .filter(([, val]) => val !== '' && val !== null && val !== undefined)
              .map(([col, val]) => `${col}: ${val}`)
              .join(', ')

          if (rowStr.length > `Sheet: ${sheetName} | `.length) {
            texts.push(rowStr)
            rowCount++
          }
        }
        console.log(`[Excel Extractor] Extracted ${rowCount} rows from sheet: ${sheetName}`)
      } catch (sheetError) {
        console.error(`[Excel Extractor] Error processing sheet ${sheetName}:`, sheetError)
        // Continue with other sheets even if one fails
        continue
      }
    }

    console.log(`[Excel Extractor] Total row records extracted: ${texts.length}`)
    
    // If no text was extracted, return a minimal record so the file is still indexed
    if (texts.length === 0) {
      console.warn('[Excel Extractor] No text extracted, returning minimal record')
      return ['Sheet: Unknown | Content: Excel file with no extractable text']
    }
    
    return texts
  } catch (error) {
    console.error('[Excel Extractor] Error:', error)
    // Don't throw - return a minimal record so upload can still succeed
    console.warn('[Excel Extractor] Returning minimal record due to extraction failure')
    return ['Sheet: Error | Content: Excel file could not be fully processed']
  }
}

/**
 * Extract content from CSV buffer
 */
export function extractTextFromCsv(buffer: Buffer): string[] {
  console.log('[CSV Extractor] Reading CSV file')

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    
    if (!sheetName) {
      console.warn('[CSV Extractor] No sheets found in CSV')
      return ['Sheet: CSV | Content: Empty CSV file']
    }
    
    const worksheet = workbook.Sheets[sheetName]

    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
    })

    const texts: string[] = []

    for (const row of jsonData) {
      const rowStr = `Sheet: CSV | ` +
        Object.entries(row)
          .filter(([, val]) => val !== '' && val !== null && val !== undefined)
          .map(([col, val]) => `${col}: ${val}`)
          .join(', ')

      if (rowStr.length > 'Sheet: CSV | '.length) {
        texts.push(rowStr)
      }
    }

    console.log(`[CSV Extractor] Extracted ${texts.length} rows`)
    
    // If no text was extracted, return a minimal record
    if (texts.length === 0) {
      console.warn('[CSV Extractor] No text extracted, returning minimal record')
      return ['Sheet: CSV | Content: CSV file with no extractable text']
    }
    
    return texts
  } catch (error) {
    console.error('[CSV Extractor] Error:', error)
    // Don't throw - return a minimal record so upload can still succeed
    console.warn('[CSV Extractor] Returning minimal record due to extraction failure')
    return ['Sheet: CSV | Content: CSV file could not be fully processed']
  }
}

/**
 * Get Excel file content preview for categorization
 * Matches Python: get_file_content_preview() for Excel files
 */
export function getExcelContentPreview(buffer: Buffer, maxSheets: number = 3): Record<string, SheetInfo> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const preview: Record<string, SheetInfo> = {}
    let sheetCount = 0

    for (const sheetName of workbook.SheetNames) {
      if (sheetCount >= maxSheets) break

      const worksheet = workbook.Sheets[sheetName]
      const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null

      if (!range) continue

      const rowCount = range.e.r - range.s.r + 1
      const columnCount = range.e.c - range.s.c + 1

      // Get column names
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        range: { s: range.s, e: { r: range.s.r, c: range.e.c } },
      })

      const columns = jsonData.length > 0 ? Object.keys(jsonData[0]).slice(0, 10) : []

      // Get sample row (first non-empty row)
      let sampleRow: Record<string, unknown> | undefined
      const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        range: { s: range.s, e: { r: Math.min(range.s.r + 5, range.e.r), c: range.e.c } },
      })

      for (const row of allRows) {
        const nonEmptyValues = Object.values(row).filter(
          val => val !== '' && val !== null && val !== undefined
        )
        if (nonEmptyValues.length >= 2) {
          sampleRow = row
          break
        }
      }

      preview[sheetName] = {
        name: sheetName,
        rowCount,
        columnCount,
        columns,
        sampleRow,
      }
      sheetCount++
    }

    return preview
  } catch (error) {
    console.error('[Excel Preview] Error:', error)
    return {}
  }
}

/**
 * Get sheet names from an Excel file
 */
export function getExcelSheetNames(buffer: Buffer): string[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  return workbook.SheetNames
}
