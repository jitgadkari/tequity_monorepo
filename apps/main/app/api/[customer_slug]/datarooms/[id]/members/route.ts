import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * GET /api/[customer_slug]/datarooms/[id]/members
 * Get all members of a dataroom
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

    if (!dataroom) {
      return ApiErrors.notFound('Dataroom')
    }

    // Get all members
    const members = await prisma.dataroomMember.findMany({
      where: {
        dataroomId,
      },
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
      orderBy: [
        { role: 'asc' }, // owners first, then admins, then members
        { joinedAt: 'asc' },
      ],
    })

    return successResponse({
      owner: dataroom.owner,
      members: members.map((m) => ({
        id: m.id,
        user: m.user,
        role: m.role,
        status: m.status,
        invitedAt: m.invitedAt,
        joinedAt: m.joinedAt,
      })),
    })
  } catch (error) {
    console.error('Get members error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * PATCH /api/[customer_slug]/datarooms/[id]/members
 * Update a member's role (owner/admin only)
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
    const { memberId, role } = body

    if (!memberId || typeof memberId !== 'string') {
      return ApiErrors.validationError('Member ID is required')
    }

    const validRoles = ['admin', 'member', 'viewer']
    if (!role || !validRoles.includes(role)) {
      return ApiErrors.validationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`)
    }

    // Get the member
    const member = await prisma.dataroomMember.findFirst({
      where: {
        id: memberId,
        dataroomId,
      },
      include: {
        user: true,
      },
    })

    if (!member) {
      return ApiErrors.notFound('Member')
    }

    // Can't change owner's role
    if (member.role === 'owner') {
      return ApiErrors.forbidden()
    }

    // Can't change own role (unless owner)
    if (member.userId === payload.userId && dataroom.ownerId !== payload.userId) {
      return ApiErrors.forbidden()
    }

    // Update member role
    const updated = await prisma.dataroomMember.update({
      where: { id: memberId },
      data: { role },
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
    })

    return successResponse({
      message: 'Member role updated successfully',
      member: {
        id: updated.id,
        user: updated.user,
        role: updated.role,
        status: updated.status,
      },
    })
  } catch (error) {
    console.error('Update member error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * DELETE /api/[customer_slug]/datarooms/[id]/members
 * Remove a member from dataroom (owner/admin only)
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

    // Parse request body or query params
    const url = new URL(request.url)
    const memberId = url.searchParams.get('memberId')

    if (!memberId) {
      return ApiErrors.validationError('Member ID is required')
    }

    // Get the member to check permissions
    const member = await prisma.dataroomMember.findFirst({
      where: {
        id: memberId,
        dataroomId,
      },
    })

    if (!member) {
      return ApiErrors.notFound('Member')
    }

    // Can't remove owner
    if (member.role === 'owner') {
      return ApiErrors.forbidden()
    }

    // Check if user is owner, admin, or removing themselves
    const dataroom = await prisma.dataroom.findFirst({
      where: {
        id: dataroomId,
        tenantSlug,
        isActive: true,
      },
    })

    if (!dataroom) {
      return ApiErrors.notFound('Dataroom')
    }

    const isOwner = dataroom.ownerId === payload.userId
    const isAdmin = await prisma.dataroomMember.findFirst({
      where: {
        dataroomId,
        userId: payload.userId,
        role: { in: ['owner', 'admin'] },
        status: 'active',
      },
    })
    const isSelf = member.userId === payload.userId

    if (!isOwner && !isAdmin && !isSelf) {
      return ApiErrors.forbidden()
    }

    // Remove member (soft delete - change status to revoked)
    await prisma.dataroomMember.update({
      where: { id: memberId },
      data: { status: 'revoked' },
    })

    return successResponse({
      message: 'Member removed successfully',
    })
  } catch (error) {
    console.error('Remove member error:', error)
    return ApiErrors.internalError()
  }
}
