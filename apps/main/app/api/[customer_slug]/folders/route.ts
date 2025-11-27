import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * GET /api/[customer_slug]/folders
 * Get all folders in a dataroom (with optional parent filter)
 */
export async function GET(
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

    // Get query params
    const url = new URL(request.url)
    const dataroomId = url.searchParams.get('dataroomId')
    const parentId = url.searchParams.get('parentId') // null for root folders

    if (!dataroomId) {
      return ApiErrors.validationError('dataroomId is required')
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

    // Get folders
    const folders = await prisma.folder.findMany({
      where: {
        dataroomId,
        parentId: parentId || null, // null gets root folders
      },
      include: {
        _count: {
          select: {
            children: true,
            files: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return successResponse({
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        dataroomId: f.dataroomId,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        childrenCount: f._count.children,
        filesCount: f._count.files,
      })),
    })
  } catch (error) {
    console.error('Get folders error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * POST /api/[customer_slug]/folders
 * Create a new folder
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

    // Parse request body
    const body = await request.json()
    const { name, dataroomId, parentId } = body

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return ApiErrors.validationError('Folder name is required')
    }

    if (!dataroomId || typeof dataroomId !== 'string') {
      return ApiErrors.validationError('dataroomId is required')
    }

    // Validate folder name
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

    // Check if user has access to this dataroom (owner/admin can create folders)
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

    // Validate parent folder exists if provided
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: parentId,
          dataroomId,
        },
      })

      if (!parentFolder) {
        return ApiErrors.notFound('Parent folder')
      }
    }

    // Check if folder with same name already exists at this level
    const existingFolder = await prisma.folder.findFirst({
      where: {
        dataroomId,
        parentId: parentId || null,
        name: trimmedName,
      },
    })

    if (existingFolder) {
      return ApiErrors.conflict('A folder with this name already exists at this location')
    }

    // Create folder
    const folder = await prisma.folder.create({
      data: {
        name: trimmedName,
        dataroomId,
        parentId: parentId || null,
        createdBy: payload.userId,
      },
    })

    return successResponse(
      {
        message: 'Folder created successfully',
        folder: {
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId,
          dataroomId: folder.dataroomId,
          createdAt: folder.createdAt,
        },
      },
      201
    )
  } catch (error) {
    console.error('Create folder error:', error)
    return ApiErrors.internalError()
  }
}
