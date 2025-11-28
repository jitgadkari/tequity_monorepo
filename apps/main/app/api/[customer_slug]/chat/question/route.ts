import { NextRequest } from 'next/server'
import { getTenantDb, isValidTenantSlug } from '@/lib/db'
import { verifyAuthWithTenant } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { z } from 'zod'
import { processQuery, processQueryStream } from '@/lib/ai'

const questionSchema = z.object({
  question: z.string().min(1).max(2000),
  dataroomId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  fileIds: z.array(z.string().uuid()).optional(),
  stream: z.boolean().optional().default(false),
})

/**
 * POST /api/[customer_slug]/chat/question
 * Ask a question and get an AI-powered answer using RAG
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
    const parseResult = questionSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { question, dataroomId, sessionId, fileIds, stream } = parseResult.data

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

    // If fileIds specified, verify they belong to this dataroom
    if (fileIds && fileIds.length > 0) {
      const validFiles = await prisma.file.count({
        where: {
          id: { in: fileIds },
          dataroomId,
        },
      })

      if (validFiles !== fileIds.length) {
        return ApiErrors.validationError('Some file IDs are invalid or do not belong to this dataroom')
      }
    }

    // If session provided, verify it exists and belongs to user
    let session = null
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId: payload.userId,
          dataroomId,
        },
      })

      if (!session) {
        return ApiErrors.notFound('Chat session')
      }
    }

    // Process the question using RAG
    console.log(`[Question] Processing: "${question.substring(0, 50)}..." for dataroom ${dataroomId}`)

    // Handle streaming response
    if (stream) {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Save user message if session provided
            if (session) {
              await prisma.chatMessage.create({
                data: {
                  sessionId: session.id,
                  role: 'user',
                  content: question,
                },
              })
            }

            const generator = processQueryStream(question, {
              dataroomId,
              fileIds,
              topK: 10,
            })

            let fullAnswer = ''
            let sources: unknown[] = []

            for await (const chunk of generator) {
              if (chunk.type === 'status') {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'status', data: chunk.data })}\n\n`)
                )
              } else if (chunk.type === 'chunk') {
                fullAnswer += chunk.data
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'chunk', data: chunk.data })}\n\n`)
                )
              } else if (chunk.type === 'done') {
                const response = chunk.data as { sources: unknown[] }
                sources = response.sources
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'done', data: response })}\n\n`)
                )
              }
            }

            // Save assistant message if session provided
            if (session && fullAnswer) {
              await prisma.chatMessage.create({
                data: {
                  sessionId: session.id,
                  role: 'assistant',
                  content: fullAnswer,
                  metadata: { sources },
                },
              })

              // Update session title if it's the first message
              const messageCount = await prisma.chatMessage.count({
                where: { sessionId: session.id },
              })

              if (messageCount <= 2 && session.title === 'New Chat') {
                // Generate title from question
                const title = question.substring(0, 50) + (question.length > 50 ? '...' : '')
                await prisma.chatSession.update({
                  where: { id: session.id },
                  data: { title },
                })
              }
            }

            controller.close()
          } catch (error) {
            console.error('[Question] Streaming error:', error)
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'error', data: 'An error occurred processing your question' })}\n\n`
              )
            )
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // Non-streaming response
    // Save user message if session provided
    if (session) {
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: question,
        },
      })
    }

    const response = await processQuery(question, {
      dataroomId,
      fileIds,
      topK: 10,
    })

    // Save assistant message if session provided
    if (session) {
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: response.answer,
          metadata: {
            sources: response.sources,
            category: response.category,
            processingTime: response.processingTime,
          },
        },
      })

      // Update session title if it's the first exchange
      const messageCount = await prisma.chatMessage.count({
        where: { sessionId: session.id },
      })

      if (messageCount <= 2 && session.title === 'New Chat') {
        const title = question.substring(0, 50) + (question.length > 50 ? '...' : '')
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { title },
        })
      }
    }

    return successResponse({
      answer: response.answer,
      sources: response.sources,
      category: response.category,
      subQueries: response.subQueries,
      processingTime: response.processingTime,
      sessionId: session?.id,
    })
  } catch (error) {
    console.error('Question error:', error)
    return ApiErrors.internalError()
  }
}
