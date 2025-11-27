import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * GET /api/[customer_slug]/datarooms/[id]
 * Get a specific dataroom by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; id: string }> }
) {
  try {
    const { customer_slug: tenantSlug, id: dataroomId } = await params

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return ApiErrors.invalidTenant()
    }

    // Verify authentication
    const payload = await verifyAuthWithTenant(request, tenantSlug)
    if (!payload) {
      return ApiErrors.unauthorized()
    }

    // Get dataroom with access check
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
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        members: {
          where: { status: 'active' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        folders: {
          where: { parentId: null }, // Only root folders
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            files: true,
            folders: true,
            chatSessions: true,
          },
        },
      },
    })

    if (!dataroom) {
      return ApiErrors.notFound('Dataroom')
    }

    // Get user's role in this dataroom
    const membership = dataroom.members.find((m) => m.userId === payload.userId)
    const userRole = dataroom.ownerId === payload.userId ? 'owner' : membership?.role || 'viewer'

    return successResponse({
      dataroom: {
        id: dataroom.id,
        name: dataroom.name,
        description: dataroom.description,
        useCase: dataroom.useCase,
        settings: dataroom.settings,
        owner: dataroom.owner,
        members: dataroom.members.map((m) => ({
          id: m.id,
          user: m.user,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        folders: dataroom.folders,
        stats: {
          fileCount: dataroom._count.files,
          folderCount: dataroom._count.folders,
          chatSessionCount: dataroom._count.chatSessions,
        },
        userRole,
        isOwner: dataroom.ownerId === payload.userId,
        createdAt: dataroom.createdAt,
        updatedAt: dataroom.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get dataroom error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * PATCH /api/[customer_slug]/datarooms/[id]
 * Update a dataroom (owner/admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; id: string }> }
) {
  try {
    const { customer_slug: tenantSlug, id: dataroomId } = await params

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return ApiErrors.invalidTenant()
    }

    // Verify authentication
    const payload = await verifyAuthWithTenant(request, tenantSlug)
    if (!payload) {
      return ApiErrors.unauthorized()
    }

    // Check if user is owner or admin
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
                role: { in: ['owner', 'admin'] },
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

    // Parse request body
    const body = await request.json()
    const { name, description, useCase, settings } = body

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return ApiErrors.validationError('Dataroom name must be at least 2 characters')
    }

    // Validate useCase if provided
    const validUseCases = ['investor', 'single_firm', 'due_diligence', 'other']
    if (useCase !== undefined && useCase !== null && !validUseCases.includes(useCase)) {
      return ApiErrors.validationError(`Invalid use case. Must be one of: ${validUseCases.join(', ')}`)
    }

    // Update dataroom
    const updated = await prisma.dataroom.update({
      where: { id: dataroomId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(useCase !== undefined && { useCase }),
        ...(settings !== undefined && { settings }),
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return successResponse({
      message: 'Dataroom updated successfully',
      dataroom: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        useCase: updated.useCase,
        settings: updated.settings,
        owner: updated.owner,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update dataroom error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * DELETE /api/[customer_slug]/datarooms/[id]
 * Delete a dataroom (owner only - soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; id: string }> }
) {
  try {
    const { customer_slug: tenantSlug, id: dataroomId } = await params

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return ApiErrors.invalidTenant()
    }

    // Verify authentication
    const payload = await verifyAuthWithTenant(request, tenantSlug)
    if (!payload) {
      return ApiErrors.unauthorized()
    }

    // Only owner can delete
    const dataroom = await prisma.dataroom.findFirst({
      where: {
        id: dataroomId,
        tenantSlug,
        ownerId: payload.userId,
        isActive: true,
      },
    })

    if (!dataroom) {
      return ApiErrors.notFound('Dataroom')
    }

    // Soft delete - set isActive to false
    await prisma.dataroom.update({
      where: { id: dataroomId },
      data: { isActive: false },
    })

    return successResponse({
      message: 'Dataroom deleted successfully',
    })
  } catch (error) {
    console.error('Delete dataroom error:', error)
    return ApiErrors.internalError()
  }
}
