import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * POST /api/[customer_slug]/files/[id]/star
 * Star a file
 */
export async function POST(
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

    // Check if already starred
    const existingStar = await prisma.starredFile.findUnique({
      where: {
        userId_fileId: {
          userId: payload.userId,
          fileId,
        },
      },
    })

    if (existingStar) {
      return successResponse({
        message: 'File already starred',
        starred: true,
      })
    }

    // Create star
    await prisma.starredFile.create({
      data: {
        userId: payload.userId,
        fileId,
      },
    })

    return successResponse({
      message: 'File starred successfully',
      starred: true,
    }, 201)
  } catch (error) {
    console.error('Star file error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * DELETE /api/[customer_slug]/files/[id]/star
 * Unstar a file
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

    // Delete star if exists
    const result = await prisma.starredFile.deleteMany({
      where: {
        userId: payload.userId,
        fileId,
      },
    })

    if (result.count === 0) {
      return successResponse({
        message: 'File was not starred',
        starred: false,
      })
    }

    return successResponse({
      message: 'File unstarred successfully',
      starred: false,
    })
  } catch (error) {
    console.error('Unstar file error:', error)
    return ApiErrors.internalError()
  }
}
