import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * GET /api/[customer_slug]/files/recent
 * Get recently visited files for the current user
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
    const limit = parseInt(url.searchParams.get('limit') || '20')

    // Build where clause for datarooms user has access to
    const accessibleDatarooms = await prisma.dataroom.findMany({
      where: {
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
        ...(dataroomId ? { id: dataroomId } : {}),
      },
      select: { id: true },
    })

    const dataroomIds = accessibleDatarooms.map((d) => d.id)

    if (dataroomIds.length === 0) {
      return successResponse({ files: [] })
    }

    // Get recent visits
    const recentVisits = await prisma.recentlyVisited.findMany({
      where: {
        userId: payload.userId,
        file: {
          dataroomId: { in: dataroomIds },
        },
      },
      include: {
        file: {
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
            dataroom: {
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
        },
      },
      orderBy: {
        visitedAt: 'desc',
      },
      take: limit,
    })

    return successResponse({
      files: recentVisits.map((rv) => ({
        id: rv.file.id,
        name: rv.file.name,
        originalName: rv.file.originalName,
        fileType: rv.file.fileType,
        fileSize: rv.file.fileSize,
        mimeType: rv.file.mimeType,
        category: rv.file.category,
        status: rv.file.status,
        folderId: rv.file.folderId,
        folder: rv.file.folder,
        dataroomId: rv.file.dataroomId,
        dataroom: rv.file.dataroom,
        createdAt: rv.file.createdAt,
        uploader: rv.file.uploader,
        isStarred: rv.file.stars.length > 0,
        visitedAt: rv.visitedAt,
      })),
    })
  } catch (error) {
    console.error('Get recent files error:', error)
    return ApiErrors.internalError()
  }
}
