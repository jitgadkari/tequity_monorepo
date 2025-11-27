import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * GET /api/[customer_slug]/files
 * Get files with optional filters
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
    const folderId = url.searchParams.get('folderId')
    const category = url.searchParams.get('category')
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')

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

    // Build where clause
    const where: Record<string, unknown> = {
      dataroomId,
    }

    if (folderId !== null) {
      where.folderId = folderId || null // null for root level files
    }

    if (category) {
      where.category = category
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get total count
    const totalCount = await prisma.file.count({ where })

    // Get files with pagination
    const files = await prisma.file.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return successResponse({
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        originalName: f.originalName,
        fileType: f.fileType,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        storageUrl: f.storageUrl,
        category: f.category,
        description: f.description,
        status: f.status,
        folderId: f.folderId,
        folder: f.folder,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        uploader: f.uploader,
        isStarred: f.stars.length > 0,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Get files error:', error)
    return ApiErrors.internalError()
  }
}
