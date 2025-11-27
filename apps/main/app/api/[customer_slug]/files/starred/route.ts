import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * GET /api/[customer_slug]/files/starred
 * Get starred files for the current user
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
    const limit = parseInt(url.searchParams.get('limit') || '50')

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

    // Get starred files
    const starredFiles = await prisma.starredFile.findMany({
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
          },
        },
      },
      orderBy: {
        starredAt: 'desc',
      },
      take: limit,
    })

    return successResponse({
      files: starredFiles.map((sf) => ({
        id: sf.file.id,
        name: sf.file.name,
        originalName: sf.file.originalName,
        fileType: sf.file.fileType,
        fileSize: sf.file.fileSize,
        mimeType: sf.file.mimeType,
        category: sf.file.category,
        status: sf.file.status,
        folderId: sf.file.folderId,
        folder: sf.file.folder,
        dataroomId: sf.file.dataroomId,
        dataroom: sf.file.dataroom,
        createdAt: sf.file.createdAt,
        uploader: sf.file.uploader,
        isStarred: true,
        starredAt: sf.starredAt,
      })),
    })
  } catch (error) {
    console.error('Get starred files error:', error)
    return ApiErrors.internalError()
  }
}
