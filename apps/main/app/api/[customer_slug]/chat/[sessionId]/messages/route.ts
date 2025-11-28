import { NextRequest } from 'next/server'
import { getTenantDb, isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { z } from 'zod'

const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  fileAttachments: z.array(z.string().uuid()).optional(),
})

/**
 * GET /api/[customer_slug]/chat/[sessionId]/messages
 * Get messages for a chat session
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

    // Get query params
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const before = url.searchParams.get('before') // For pagination

    // Check if session exists and user owns it
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: payload.userId,
        dataroom: { tenantSlug },
      },
    })

    if (!session) {
      return ApiErrors.notFound('Chat session')
    }

    // Get messages
    const messages = await prisma.chatMessage.findMany({
      where: {
        sessionId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    })

    return successResponse({
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
        fileAttachments: msg.fileAttachments,
        createdAt: msg.createdAt,
      })),
    })
  } catch (error) {
    console.error('Get messages error:', error)
    return ApiErrors.internalError()
  }
}

/**
 * POST /api/[customer_slug]/chat/[sessionId]/messages
 * Add a message to a chat session
 */
export async function POST(
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
    const parseResult = addMessageSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { role, content, metadata, fileAttachments } = parseResult.data

    // Check if session exists and user owns it
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: payload.userId,
        dataroom: { tenantSlug },
      },
    })

    if (!session) {
      return ApiErrors.notFound('Chat session')
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
        metadata: metadata || null,
        fileAttachments: fileAttachments || null,
      },
    })

    // Update session's updatedAt
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    })

    return successResponse(
      {
        message: 'Message added successfully',
        chatMessage: {
          id: message.id,
          role: message.role,
          content: message.content,
          metadata: message.metadata,
          fileAttachments: message.fileAttachments,
          createdAt: message.createdAt,
        },
      },
      201
    )
  } catch (error) {
    console.error('Add message error:', error)
    return ApiErrors.internalError()
  }
}
