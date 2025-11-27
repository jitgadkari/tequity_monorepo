import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * GET /api/[customer_slug]/datarooms
 * Get all datarooms for the authenticated user
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

    // Get datarooms where user is owner or member
    const datarooms = await prisma.dataroom.findMany({
      where: {
        tenantSlug,
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
        isActive: true,
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
        _count: {
          select: {
            files: true,
            folders: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return successResponse({
      datarooms: datarooms.map((dr) => ({
        id: dr.id,
        name: dr.name,
        description: dr.description,
        useCase: dr.useCase,
        owner: dr.owner,
        memberCount: dr.members.length,
        fileCount: dr._count.files,
        folderCount: dr._count.folders,
        isOwner: dr.ownerId === payload.userId,
        createdAt: dr.createdAt,
        updatedAt: dr.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get datarooms error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * POST /api/[customer_slug]/datarooms
 * Create a new dataroom
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
    const { name, description, useCase } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return ApiErrors.validationError('Dataroom name is required (min 2 characters)')
    }

    // Validate useCase if provided
    const validUseCases = ['investor', 'single_firm', 'due_diligence', 'other']
    if (useCase && !validUseCases.includes(useCase)) {
      return ApiErrors.validationError(`Invalid use case. Must be one of: ${validUseCases.join(', ')}`)
    }

    // Create dataroom
    const dataroom = await prisma.dataroom.create({
      data: {
        tenantSlug,
        name: name.trim(),
        description: description?.trim() || null,
        useCase: useCase || null,
        ownerId: payload.userId,
        isActive: true,
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

    // Add owner as a member with 'owner' role
    await prisma.dataroomMember.create({
      data: {
        dataroomId: dataroom.id,
        userId: payload.userId,
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
      },
    })

    return successResponse({
      message: 'Dataroom created successfully',
      dataroom: {
        id: dataroom.id,
        name: dataroom.name,
        description: dataroom.description,
        useCase: dataroom.useCase,
        owner: dataroom.owner,
        isOwner: true,
        createdAt: dataroom.createdAt,
      },
    }, 201)
  } catch (error) {
    console.error('Create dataroom error:', error)
    return ApiErrors.internalError()
  }
}
