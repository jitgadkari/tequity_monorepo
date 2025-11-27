/**
 * File Processing Types
 * Matching Python backend types for consistency
 */

export interface ExtractedContent {
  text: string
  metadata: {
    pageCount?: number
    sheetCount?: number
    wordCount: number
    charCount: number
    sheets?: SheetInfo[]
    pages?: PageInfo[]
  }
}

export interface SheetInfo {
  name: string
  rowCount: number
  columnCount: number
  columns?: string[]
  sampleRow?: Record<string, unknown>
}

export interface PageInfo {
  pageNumber: number
  text: string
}

export interface ChunkMetadata {
  source: string
  chunkIndex: number
  totalChunks: number
  pageNumber?: number
  sheetName?: string
  rowRange?: string
  category?: string
  rowNumber?: number
}

export interface TextChunk {
  content: string
  metadata: ChunkMetadata
}

export interface EmbeddingRecord {
  pointId: string
  fileId?: string
  text: string
  embedding?: number[]
  category?: string
  sourceFile?: string
  sheetName?: string
  rowNumber?: number
  metadata?: Record<string, unknown>
}

export type SupportedFileType = 'pdf' | 'xlsx' | 'xls' | 'csv' | 'docx' | 'doc' | 'txt'

export const SUPPORTED_MIME_TYPES: Record<SupportedFileType, string[]> = {
  pdf: ['application/pdf'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  xls: ['application/vnd.ms-excel'],
  csv: ['text/csv', 'application/csv'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  doc: ['application/msword'],
  txt: ['text/plain'],
}

// Financial categories - same as Python backend
export const FINANCIAL_CATEGORIES = [
  'Accounts Payable',
  'Accounts Receivable',
  'Cap Table',
  'Customer Contracts',
  'Financial Projections',
  'Monthly Financials',
  'Revenue By Customer',
  'Stock Option Grants',
  'Vendor Contracts',
  'YTD Financials',
  'Balance Sheet',
  'Income Statement',
  'Cash Flow',
  'Budget',
  'Expenses',
  'Payroll',
  'Investments',
  'Assets',
  'Liabilities',
  'Tax Documents',
] as const

export type FinancialCategory = typeof FINANCIAL_CATEGORIES[number]

export function getFileTypeFromMime(mimeType: string): SupportedFileType | null {
  for (const [type, mimes] of Object.entries(SUPPORTED_MIME_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type as SupportedFileType
    }
  }
  return null
}

export function getFileTypeFromExtension(filename: string): SupportedFileType | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext && ext in SUPPORTED_MIME_TYPES) {
    return ext as SupportedFileType
  }
  return null
}
