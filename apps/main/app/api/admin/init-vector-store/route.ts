import { NextRequest, NextResponse } from 'next/server'
import { initVectorStore } from '@/lib/ai'

/**
 * POST /api/admin/init-vector-store
 * Initialize pgvector extension and vector column
 * Should be run once during setup
 *
 * Requires ADMIN_SECRET header for authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Simple admin secret check
    const adminSecret = request.headers.get('x-admin-secret')
    const expectedSecret = process.env.ADMIN_SECRET || 'admin-secret-change-me'

    if (adminSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Admin] Initializing vector store...')

    await initVectorStore()

    return NextResponse.json({
      success: true,
      message: 'Vector store initialized successfully',
      details: {
        extension: 'pgvector enabled',
        column: 'embedding vector(1536) added to DocumentEmbedding',
        index: 'ivfflat index created for cosine similarity',
      },
    })
  } catch (error) {
    console.error('[Admin] Vector store initialization error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/init-vector-store
 * Check vector store status
 */
export async function GET(request: NextRequest) {
  try {
    // Simple admin secret check
    const adminSecret = request.headers.get('x-admin-secret')
    const expectedSecret = process.env.ADMIN_SECRET || 'admin-secret-change-me'

    if (adminSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Import prisma for status check
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // Check if pgvector extension exists
    const extensionResult = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `

    // Check if embedding column exists
    const columnResult = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'DocumentEmbedding'
      AND column_name = 'embedding'
    `

    // Get embedding count
    const countResult = await prisma.documentEmbedding.count()

    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      status: {
        pgvectorEnabled: extensionResult.length > 0,
        embeddingColumnExists: columnResult.length > 0,
        embeddingCount: countResult,
      },
    })
  } catch (error) {
    console.error('[Admin] Vector store status check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed',
      },
      { status: 500 }
    )
  }
}
