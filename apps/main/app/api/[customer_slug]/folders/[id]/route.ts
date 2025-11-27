import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * GET /api/[customer_slug]/folders/[id]
 * Get a single folder with its contents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; id: string }> }
) {
  try {
    const { customer_slug: tenantSlug, id: folderId } = await params

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return ApiErrors.invalidTenant()
    }

    // Verify authentication
    const payload = await verifyAuthWithTenant(request, tenantSlug)
    if (!payload) {
      return ApiErrors.unauthorized()
    }

    // Get folder with its dataroom
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        dataroom: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                children: true,
                files: true,
              },
            },
          },
        },
        files: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    })

    if (!folder) {
      return ApiErrors.notFound('Folder')
    }

    // Check if user has access to this dataroom
    const hasAccess = await prisma.dataroom.findFirst({
      where: {
        id: folder.dataroomId,
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

    // Build breadcrumb path
    const breadcrumbs = await buildBreadcrumbs(folderId)

    return successResponse({
      folder: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        parent: folder.parent,
        dataroomId: folder.dataroomId,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      },
      breadcrumbs,
      children: folder.children.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        createdAt: f.createdAt,
        childrenCount: f._count.children,
        filesCount: f._count.files,
      })),
      files: folder.files.map((f) => ({
        id: f.id,
        name: f.name,
        originalName: f.originalName,
        fileType: f.fileType,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        category: f.category,
        status: f.status,
        createdAt: f.createdAt,
        uploader: f.uploader,
      })),
    })
  } catch (error) {
    console.error('Get folder error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * PATCH /api/[customer_slug]/folders/[id]
 * Update folder (rename, move)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; id: string }> }
) {
  try {
    const { customer_slug: tenantSlug, id: folderId } = await params

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return ApiErrors.invalidTenant()
    }

    // Verify authentication
    const payload = await verifyAuthWithTenant(request, tenantSlug)
    if (!payload) {
      return ApiErrors.unauthorized()
    }

    // Get folder
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: { dataroom: true },
    })

    if (!folder) {
      return ApiErrors.notFound('Folder')
    }

    // Check if user has permission (owner/admin)
    const hasPermission = await prisma.dataroom.findFirst({
      where: {
        id: folder.dataroomId,
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

    if (!hasPermission) {
      return ApiErrors.forbidden()
    }

    // Parse request body
    const body = await request.json()
    const { name, parentId } = body

    const updateData: Record<string, unknown> = {}

    // Handle rename
    if (name !== undefined) {
      const trimmedName = name.trim()
      if (trimmedName.length < 1) {
        return ApiErrors.validationError('Folder name cannot be empty')
      }
      if (trimmedName.length > 255) {
        return ApiErrors.validationError('Folder name must not exceed 255 characters')
      }

      // Check for invalid characters
      const invalidChars = /[<>:"/\\|?*]/
      if (invalidChars.test(trimmedName)) {
        return ApiErrors.validationError('Folder name contains invalid characters')
      }

      // Check for duplicate name at target location
      const targetParentId = parentId !== undefined ? parentId : folder.parentId
      const existingFolder = await prisma.folder.findFirst({
        where: {
          dataroomId: folder.dataroomId,
          parentId: targetParentId || null,
          name: trimmedName,
          id: { not: folderId },
        },
      })

      if (existingFolder) {
        return ApiErrors.conflict('A folder with this name already exists at this location')
      }

      updateData.name = trimmedName
    }

    // Handle move
    if (parentId !== undefined) {
      // Can't move folder into itself or its descendants
      if (parentId === folderId) {
        return ApiErrors.validationError('Cannot move folder into itself')
      }

      if (parentId !== null) {
        // Verify parent folder exists and is in same dataroom
        const newParent = await prisma.folder.findFirst({
          where: {
            id: parentId,
            dataroomId: folder.dataroomId,
          },
        })

        if (!newParent) {
          return ApiErrors.notFound('Target parent folder')
        }

        // Check if target is a descendant of the folder being moved
        const isDescendant = await checkIsDescendant(parentId, folderId)
        if (isDescendant) {
          return ApiErrors.validationError('Cannot move folder into its own subfolder')
        }
      }

      updateData.parentId = parentId
    }

    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validationError('No valid fields to update')
    }

    // Update folder
    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: updateData,
    })

    return successResponse({
      message: 'Folder updated successfully',
      folder: {
        id: updatedFolder.id,
        name: updatedFolder.name,
        parentId: updatedFolder.parentId,
        dataroomId: updatedFolder.dataroomId,
        updatedAt: updatedFolder.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update folder error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * DELETE /api/[customer_slug]/folders/[id]
 * Delete folder and all its contents
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; id: string }> }
) {
  try {
    const { customer_slug: tenantSlug, id: folderId } = await params

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return ApiErrors.invalidTenant()
    }

    // Verify authentication
    const payload = await verifyAuthWithTenant(request, tenantSlug)
    if (!payload) {
      return ApiErrors.unauthorized()
    }

    // Get folder
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        _count: {
          select: {
            children: true,
            files: true,
          },
        },
      },
    })

    if (!folder) {
      return ApiErrors.notFound('Folder')
    }

    // Check if user has permission (owner/admin)
    const hasPermission = await prisma.dataroom.findFirst({
      where: {
        id: folder.dataroomId,
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

    if (!hasPermission) {
      return ApiErrors.forbidden()
    }

    // Delete folder (cascade will delete children and files)
    await prisma.folder.delete({
      where: { id: folderId },
    })

    return successResponse({
      message: 'Folder deleted successfully',
      deletedFolderCount: 1 + folder._count.children,
      deletedFileCount: folder._count.files,
    })
  } catch (error) {
    console.error('Delete folder error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * Build breadcrumb path for a folder
 */
async function buildBreadcrumbs(folderId: string): Promise<Array<{ id: string; name: string }>> {
  const breadcrumbs: Array<{ id: string; name: string }> = []
  let currentId: string | null = folderId

  while (currentId) {
    const folder = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true },
    })

    if (folder) {
      breadcrumbs.unshift({ id: folder.id, name: folder.name })
      currentId = folder.parentId
    } else {
      break
    }
  }

  return breadcrumbs
}

/**
 * Check if targetId is a descendant of parentId
 */
async function checkIsDescendant(targetId: string, parentId: string): Promise<boolean> {
  let currentId: string | null = targetId

  while (currentId) {
    const folder = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    })

    if (!folder) break

    if (folder.parentId === parentId) {
      return true
    }
    currentId = folder.parentId
  }

  return false
}
