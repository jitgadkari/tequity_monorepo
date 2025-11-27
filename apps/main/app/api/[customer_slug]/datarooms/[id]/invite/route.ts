import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * POST /api/[customer_slug]/datarooms/[id]/invite
 * Invite a user to a dataroom (owner/admin only)
 */
export async function POST(
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
    const { email, role = 'member' } = body

    if (!email || typeof email !== 'string') {
      return ApiErrors.validationError('Email is required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return ApiErrors.validationError('Invalid email format')
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Validate role
    const validRoles = ['admin', 'member', 'viewer']
    if (!validRoles.includes(role)) {
      return ApiErrors.validationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`)
    }

    // Check if user exists in this tenant
    let invitedUser = await prisma.user.findUnique({
      where: {
        tenantSlug_email: {
          tenantSlug,
          email: normalizedEmail,
        },
      },
    })

    // If user doesn't exist, create a placeholder (they'll need to sign up)
    if (!invitedUser) {
      invitedUser = await prisma.user.create({
        data: {
          tenantSlug,
          email: normalizedEmail,
          role: 'member',
          isActive: true,
          emailVerified: false, // Not verified until they sign up
        },
      })
    }

    // Check if already a member
    const existingMember = await prisma.dataroomMember.findFirst({
      where: {
        dataroomId,
        userId: invitedUser.id,
      },
    })

    if (existingMember) {
      if (existingMember.status === 'active') {
        return ApiErrors.conflict('User is already a member of this dataroom')
      }

      // Re-invite if previously revoked
      if (existingMember.status === 'revoked') {
        const updated = await prisma.dataroomMember.update({
          where: { id: existingMember.id },
          data: {
            status: 'pending',
            role,
            invitedBy: payload.userId,
            invitedAt: new Date(),
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
        })

        // TODO: Send invitation email
        console.log('========================================')
        console.log(`📧 Dataroom Invitation:`)
        console.log(`   Email: ${normalizedEmail}`)
        console.log(`   Dataroom: ${dataroom.name}`)
        console.log(`   Role: ${role}`)
        console.log(`   Invited by: ${payload.email}`)
        console.log('========================================')

        return successResponse({
          message: 'User re-invited to dataroom',
          member: {
            id: updated.id,
            user: updated.user,
            role: updated.role,
            status: updated.status,
          },
        })
      }
    }

    // Create new membership
    const member = await prisma.dataroomMember.create({
      data: {
        dataroomId,
        userId: invitedUser.id,
        role,
        invitedBy: payload.userId,
        status: 'pending',
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
    })

    // TODO: Send invitation email
    console.log('========================================')
    console.log(`📧 Dataroom Invitation:`)
    console.log(`   Email: ${normalizedEmail}`)
    console.log(`   Dataroom: ${dataroom.name}`)
    console.log(`   Role: ${role}`)
    console.log(`   Invited by: ${payload.email}`)
    console.log('========================================')

    return successResponse({
      message: 'User invited to dataroom',
      member: {
        id: member.id,
        user: member.user,
        role: member.role,
        status: member.status,
      },
    }, 201)
  } catch (error) {
    console.error('Invite member error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * PATCH /api/[customer_slug]/datarooms/[id]/invite
 * Accept or decline an invitation
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

    // Parse request body
    const body = await request.json()
    const { action } = body // 'accept' or 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return ApiErrors.validationError('Action must be "accept" or "decline"')
    }

    // Find pending invitation for this user
    const invitation = await prisma.dataroomMember.findFirst({
      where: {
        dataroomId,
        userId: payload.userId,
        status: 'pending',
      },
      include: {
        dataroom: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!invitation) {
      return ApiErrors.notFound('Invitation')
    }

    if (action === 'accept') {
      // Accept invitation
      const updated = await prisma.dataroomMember.update({
        where: { id: invitation.id },
        data: {
          status: 'active',
          joinedAt: new Date(),
        },
      })

      return successResponse({
        message: `You have joined ${invitation.dataroom.name}`,
        membership: {
          id: updated.id,
          role: updated.role,
          status: updated.status,
          joinedAt: updated.joinedAt,
        },
      })
    } else {
      // Decline invitation
      await prisma.dataroomMember.update({
        where: { id: invitation.id },
        data: { status: 'revoked' },
      })

      return successResponse({
        message: 'Invitation declined',
      })
    }
  } catch (error) {
    console.error('Handle invitation error:', error)
    return ApiErrors.internalError()
  }
}
