import { NextRequest, NextResponse } from 'next/server'
import { readFile, unlink } from 'fs/promises'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * GET /api/[customer_slug]/files/[id]
 * Get file details or download file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; id: string }> }
) {
  try {
    const { customer_slug: tenantSlug, id: fileId } = await params

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return ApiErrors.invalidTenant()
    }

    // Verify authentication
    const payload = await verifyAuthWithTenant(request, tenantSlug)
    if (!payload) {
      return ApiErrors.unauthorized()
    }

    // Check if download is requested
    const url = new URL(request.url)
    const download = url.searchParams.get('download') === 'true'

    // Get file
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        stars: {
          where: {
            userId: payload.userId,
          },
          select: {
            id: true,
          },
        },
        dataroom: true,
      },
    })

    if (!file) {
      return ApiErrors.notFound('File')
    }

    // Check if user has access to this dataroom
    const hasAccess = await prisma.dataroom.findFirst({
      where: {
        id: file.dataroomId,
        tenantSlug,
        isActive: true,
        OR: [
          { ownerId: payload.userId },
          {
            members: {
              some: {
                userId: payload.userId,
                status: 'active',
              },
            },
          },
        ],
      },
    })

    if (!hasAccess) {
      return ApiErrors.forbidden()
    }

    // Track recent visit
    await prisma.recentlyVisited.upsert({
      where: {
        userId_fileId: {
          userId: payload.userId,
          fileId,
        },
      },
      update: {
        visitedAt: new Date(),
      },
      create: {
        userId: payload.userId,
        fileId,
      },
    })

    // Handle download
    if (download) {
      try {
        const fileBuffer = await readFile(file.storageUrl)
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': file.mimeType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
            'Content-Length': file.fileSize.toString(),
          },
        })
      } catch (error) {
        console.error('File read error:', error)
        return ApiErrors.notFound('File content')
      }
    }

    // Return file details
    return successResponse({
      file: {
        id: file.id,
        name: file.name,
        originalName: file.originalName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        category: file.category,
        description: file.description,
        status: file.status,
        metadata: file.metadata,
        folderId: file.folderId,
        folder: file.folder,
        dataroomId: file.dataroomId,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        uploader: file.uploader,
        isStarred: file.stars.length > 0,
      },
    })
  } catch (error) {
    console.error('Get file error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * PATCH /api/[customer_slug]/files/[id]
 * Update file metadata (rename, move, update description)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; id: string }> }
) {
  try {
    const { customer_slug: tenantSlug, id: fileId } = await params

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return ApiErrors.invalidTenant()
    }

    // Verify authentication
    const payload = await verifyAuthWithTenant(request, tenantSlug)
    if (!payload) {
      return ApiErrors.unauthorized()
    }

    // Get file
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    })

    if (!file) {
      return ApiErrors.notFound('File')
    }

    // Check if user has permission (owner/admin or uploader)
    const hasPermission = await prisma.dataroom.findFirst({
      where: {
        id: file.dataroomId,
        tenantSlug,
        isActive: true,
        OR: [
          { ownerId: payload.userId },
          {
            members: {
              some: {
                userId: payload.userId,
                role: { in: ['owner', 'admin'] },
                status: 'active',
              },
            },
          },
        ],
      },
    })

    // Allow uploader to edit their own files
    const isUploader = file.uploadedBy === payload.userId

    if (!hasPermission && !isUploader) {
      return ApiErrors.forbidden()
    }

    // Parse request body
    const body = await request.json()
    const { name, description, folderId, category } = body

    const updateData: Record<string, unknown> = {}

    // Handle rename
    if (name !== undefined) {
      const trimmedName = name.trim()
      if (trimmedName.length < 1) {
        return ApiErrors.validationError('File name cannot be empty')
      }
      if (trimmedName.length > 255) {
        return ApiErrors.validationError('File name must not exceed 255 characters')
      }
      updateData.originalName = trimmedName
    }

    // Handle description update
    if (description !== undefined) {
      updateData.description = description || null
    }

    // Handle category update
    if (category !== undefined) {
      updateData.category = category || null
    }

    // Handle move
    if (folderId !== undefined) {
      if (folderId !== null) {
        // Verify folder exists and is in same dataroom
        const folder = await prisma.folder.findFirst({
          where: {
            id: folderId,
            dataroomId: file.dataroomId,
          },
        })

        if (!folder) {
          return ApiErrors.notFound('Target folder')
        }
      }
      updateData.folderId = folderId
    }

    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validationError('No valid fields to update')
    }

    // Update file
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: updateData,
    })

    return successResponse({
      message: 'File updated successfully',
      file: {
        id: updatedFile.id,
        name: updatedFile.name,
        originalName: updatedFile.originalName,
        description: updatedFile.description,
        category: updatedFile.category,
        folderId: updatedFile.folderId,
        updatedAt: updatedFile.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update file error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * DELETE /api/[customer_slug]/files/[id]
 * Delete a file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; id: string }> }
) {
  try {
    const { customer_slug: tenantSlug, id: fileId } = await params

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return ApiErrors.invalidTenant()
    }

    // Verify authentication
    const payload = await verifyAuthWithTenant(request, tenantSlug)
    if (!payload) {
      return ApiErrors.unauthorized()
    }

    // Get file
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    })

    if (!file) {
      return ApiErrors.notFound('File')
    }

    // Check if user has permission (owner/admin)
    const hasPermission = await prisma.dataroom.findFirst({
      where: {
        id: file.dataroomId,
        tenantSlug,
        isActive: true,
        OR: [
          { ownerId: payload.userId },
          {
            members: {
              some: {
                userId: payload.userId,
                role: { in: ['owner', 'admin'] },
                status: 'active',
              },
            },
          },
        ],
      },
    })

    // Allow uploader to delete their own files
    const isUploader = file.uploadedBy === payload.userId

    if (!hasPermission && !isUploader) {
      return ApiErrors.forbidden()
    }

    // Delete physical file
    try {
      await unlink(file.storageUrl)
    } catch (error) {
      console.warn('Could not delete physical file:', error)
      // Continue with database deletion even if file not found
    }

    // Delete file record (cascade will delete embeddings, stars, recent visits)
    await prisma.file.delete({
      where: { id: fileId },
    })

    return successResponse({
      message: 'File deleted successfully',
    })
  } catch (error) {
    console.error('Delete file error:', error)
    return ApiErrors.internalError()
  }
}
