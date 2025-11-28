import { NextRequest } from 'next/server'
import { getTenantDb, isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { z } from 'zod'

const updateSessionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/[customer_slug]/chat/[sessionId]
 * Get a specific chat session with messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; sessionId: string }> }
) {
  try {
    const { customer_slug: tenantSlug, sessionId } = await params

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

    // Get chat session with messages
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: payload.userId,
        dataroom: { tenantSlug },
      },
      include: {
        dataroom: {
          select: {
            id: true,
            name: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!session) {
      return ApiErrors.notFound('Chat session')
    }

    return successResponse({
      session: {
        id: session.id,
        title: session.title,
        dataroomId: session.dataroomId,
        dataroom: session.dataroom,
        isActive: session.isActive,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: session.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata,
          fileAttachments: msg.fileAttachments,
          createdAt: msg.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Get chat session error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * PATCH /api/[customer_slug]/chat/[sessionId]
 * Update a chat session (title, isActive)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; sessionId: string }> }
) {
  try {
    const { customer_slug: tenantSlug, sessionId } = await params

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
    const parseResult = updateSessionSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    // Check if session exists and user owns it
    const existingSession = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: payload.userId,
        dataroom: { tenantSlug },
      },
    })

    if (!existingSession) {
      return ApiErrors.notFound('Chat session')
    }

    // Update session
    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: parseResult.data,
      include: {
        dataroom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return successResponse({
      message: 'Chat session updated successfully',
      session: {
        id: session.id,
        title: session.title,
        dataroomId: session.dataroomId,
        dataroom: session.dataroom,
        isActive: session.isActive,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update chat session error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * DELETE /api/[customer_slug]/chat/[sessionId]
 * Delete a chat session and all its messages
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string; sessionId: string }> }
) {
  try {
    const { customer_slug: tenantSlug, sessionId } = await params

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

    // Check if session exists and user owns it
    const existingSession = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: payload.userId,
        dataroom: { tenantSlug },
      },
    })

    if (!existingSession) {
      return ApiErrors.notFound('Chat session')
    }

    // Delete session (messages will cascade)
    await prisma.chatSession.delete({
      where: { id: sessionId },
    })

    return successResponse({
      message: 'Chat session deleted successfully',
    })
  } catch (error) {
    console.error('Delete chat session error:', error)
    return ApiErrors.internalError()
  }
}
