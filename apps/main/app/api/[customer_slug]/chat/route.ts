import { NextRequest } from 'next/server'
import { getTenantDb, isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { z } from 'zod'

const createSessionSchema = z.object({
  dataroomId: z.string().uuid(),
  title: z.string().optional(),
})

/**
 * GET /api/[customer_slug]/chat
 * Get all chat sessions for the current user
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

    // Get tenant-specific database connection
    const prisma = await getTenantDb(tenantSlug)

    // Get query params
    const url = new URL(request.url)
    const dataroomId = url.searchParams.get('dataroomId')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    // Build where clause
    const where: {
      userId: string
      dataroom: { tenantSlug: string }
      dataroomId?: string
      isActive?: boolean
    } = {
      userId: payload.userId,
      dataroom: { tenantSlug },
    }

    if (dataroomId) {
      where.dataroomId = dataroomId
    }

    // Get chat sessions
    const sessions = await prisma.chatSession.findMany({
      where,
      include: {
        dataroom: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    })

    return successResponse({
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title || 'New Chat',
        dataroomId: session.dataroomId,
        dataroom: session.dataroom,
        messageCount: session._count.messages,
        isActive: session.isActive,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get chat sessions error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * POST /api/[customer_slug]/chat
 * Create a new chat session
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

    // Get tenant-specific database connection
    const prisma = await getTenantDb(tenantSlug)

    // Parse request body
    const body = await request.json()
    const parseResult = createSessionSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { dataroomId, title } = parseResult.data

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

    // Create chat session
    const session = await prisma.chatSession.create({
      data: {
        dataroomId,
        userId: payload.userId,
        title: title || 'New Chat',
      },
      include: {
        dataroom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return successResponse(
      {
        message: 'Chat session created successfully',
        session: {
          id: session.id,
          title: session.title,
          dataroomId: session.dataroomId,
          dataroom: session.dataroom,
          isActive: session.isActive,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
      },
      201
    )
  } catch (error) {
    console.error('Create chat session error:', error)
    return ApiErrors.internalError()
  }
}
