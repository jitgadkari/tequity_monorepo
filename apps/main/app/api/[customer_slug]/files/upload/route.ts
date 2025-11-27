import { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { processFileForRAG, getFileTypeFromExtension } from '@/lib/file-processing'
import { embedRecords, upsertEmbeddings, type EmbeddingRecord, type VectorRecord } from '@/lib/ai'

// Upload directory configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default

/**
 * POST /api/[customer_slug]/files/upload
 * Upload a file to a dataroom
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string }> }
) {
  try {
    const { customer_slug: tenantSlug } = await params

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return ApiErrors.invalidTenant()
    }

    // Verify authentication
    const payload = await verifyAuthWithTenant(request, tenantSlug)
    if (!payload) {
      return ApiErrors.unauthorized()
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const dataroomId = formData.get('dataroomId') as string | null
    const folderId = formData.get('folderId') as string | null
    const processForRAG = formData.get('processForRAG') !== 'false' // Default true

    // Validate file
    if (!file) {
      return ApiErrors.validationError('File is required')
    }

    if (!dataroomId) {
      return ApiErrors.validationError('dataroomId is required')
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return ApiErrors.validationError(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`)
    }

    // Validate file type
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const fileType = getFileTypeFromExtension(file.name)

    if (!fileType) {
      return ApiErrors.validationError(`Unsupported file type: .${fileExt}`)
    }

    // Check if user has access to this dataroom
    const dataroom = await prisma.dataroom.findFirst({
      where: {
        id: dataroomId,
        tenantSlug,
        isActive: true,
        OR: [
          { ownerId: payload.userId },
          {
            members: {
              some: {
                userId: payload.userId,
                role: { in: ['owner', 'admin', 'member'] },
                status: 'active',
              },
            },
          },
        ],
      },
    })

    if (!dataroom) {
      return ApiErrors.notFound('Dataroom')
    }

    // Validate folder if provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          dataroomId,
        },
      })

      if (!folder) {
        return ApiErrors.notFound('Folder')
      }
    }

    // Create upload directory structure
    const uploadPath = path.join(UPLOAD_DIR, tenantSlug, dataroomId)
    await mkdir(uploadPath, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storedName = `${timestamp}_${sanitizedName}`
    const filePath = path.join(uploadPath, storedName)

    // Convert File to Buffer and save
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(filePath, buffer)

    // Create file record in database
    const fileRecord = await prisma.file.create({
      data: {
        dataroomId,
        folderId: folderId || null,
        uploadedBy: payload.userId,
        name: storedName,
        originalName: file.name,
        fileType: fileType,
        fileSize: file.size,
        mimeType: file.type || null,
        storageUrl: filePath,
        status: processForRAG ? 'processing' : 'uploaded',
      },
    })

    // Process file for RAG in background (if enabled)
    if (processForRAG) {
      // Start async processing - don't wait for it
      processFileAsync(fileRecord.id, buffer, file.name).catch((error) => {
        console.error(`[Upload] Async processing failed for ${fileRecord.id}:`, error)
      })
    }

    return successResponse(
      {
        message: 'File uploaded successfully',
        file: {
          id: fileRecord.id,
          name: fileRecord.name,
          originalName: fileRecord.originalName,
          fileType: fileRecord.fileType,
          fileSize: fileRecord.fileSize,
          mimeType: fileRecord.mimeType,
          status: fileRecord.status,
          folderId: fileRecord.folderId,
          dataroomId: fileRecord.dataroomId,
          createdAt: fileRecord.createdAt,
        },
      },
      201
    )
  } catch (error) {
    console.error('Upload file error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * Process file for RAG asynchronously
 * Extracts text, generates embeddings, and stores in vector database
 */
async function processFileAsync(fileId: string, buffer: Buffer, filename: string) {
  console.log(`[Upload] Starting async processing for ${fileId}`)

  try {
    // Step 1: Process file for RAG (extract text, chunk, classify)
    const processed = await processFileForRAG(buffer, filename, { fileId })

    console.log(`[Upload] Extracted ${processed.chunks.length} chunks, category: ${processed.category}`)

    // Step 2: Update file record with category
    await prisma.file.update({
      where: { id: fileId },
      data: {
        category: processed.category,
        description: processed.description,
        status: 'embedding', // New status while generating embeddings
        metadata: {
          chunkCount: processed.chunks.length,
          processedAt: new Date().toISOString(),
        },
      },
    })

    // Step 3: Generate embeddings for all chunks (batch processing)
    if (processed.records.length > 0) {
      console.log(`[Upload] Generating embeddings for ${processed.records.length} chunks...`)

      // Convert to EmbeddingRecord format
      const embeddingRecords: EmbeddingRecord[] = processed.records.map((record, index) => ({
        pointId: record.pointId,
        fileId,
        text: record.text,
        category: record.category,
        sourceFile: record.sourceFile,
        rowNumber: record.rowNumber,
        metadata: {
          category: record.category,
          sourceFile: record.sourceFile,
          sheetName: record.metadata?.sheetName,
          rowNumber: record.rowNumber,
          chunkIndex: index,
          totalChunks: processed.records.length,
        },
      }))

      // Generate embeddings using batch processing
      const recordsWithEmbeddings = await embedRecords(embeddingRecords)

      // Step 4: Store embeddings in vector database
      const vectorRecords: VectorRecord[] = recordsWithEmbeddings
        .filter((r) => r.embedding && r.embedding.length > 0)
        .map((r) => ({
          pointId: r.pointId,
          fileId: r.fileId,
          content: r.text,
          embedding: r.embedding!,
          metadata: r.metadata as VectorRecord['metadata'],
        }))

      if (vectorRecords.length > 0) {
        console.log(`[Upload] Upserting ${vectorRecords.length} embeddings to vector store...`)
        await upsertEmbeddings(vectorRecords, fileId)
      }

      // Also create Prisma records for reference (without embedding column for now)
      // The embedding column will be populated via raw SQL in upsertEmbeddings
      try {
        await prisma.documentEmbedding.createMany({
          data: processed.records.map((record, index) => ({
            id: record.pointId,
            fileId,
            chunkIndex: index,
            content: record.text,
            metadata: {
              category: record.category || null,
              sourceFile: record.sourceFile || null,
              sheetName: (record.metadata?.sheetName as string) || null,
              rowNumber: record.rowNumber || null,
            },
          })),
          skipDuplicates: true,
        })
      } catch (err) {
        // Ignore duplicate errors since upsertEmbeddings already handles this
        console.log('[Upload] Prisma createMany skipped (records may already exist)')
      }
    }

    // Step 5: Update file status to ready
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'ready',
        metadata: {
          chunkCount: processed.chunks.length,
          embeddingCount: processed.records.length,
          processedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      },
    })

    console.log(`[Upload] Completed processing for ${fileId}: ${processed.chunks.length} chunks with embeddings`)
  } catch (error) {
    console.error(`[Upload] Processing failed for ${fileId}:`, error)

    // Update file status to error
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Processing failed',
          errorAt: new Date().toISOString(),
        },
      },
    })
  }
}
