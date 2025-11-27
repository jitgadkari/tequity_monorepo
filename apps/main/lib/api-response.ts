import { NextResponse } from 'next/server'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Error response helper
 */
export function errorResponse(
  error: string,
  status = 400,
  code?: string
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error, code }, { status })
}

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: () => errorResponse('Unauthorized', 401, 'UNAUTHORIZED'),
  forbidden: () => errorResponse('Forbidden', 403, 'FORBIDDEN'),
  notFound: (resource = 'Resource') =>
    errorResponse(`${resource} not found`, 404, 'NOT_FOUND'),
  badRequest: (message = 'Bad request') =>
    errorResponse(message, 400, 'BAD_REQUEST'),
  conflict: (message = 'Conflict') =>
    errorResponse(message, 409, 'CONFLICT'),
  internalError: (message = 'Internal server error') =>
    errorResponse(message, 500, 'INTERNAL_ERROR'),
  validationError: (message: string) =>
    errorResponse(message, 422, 'VALIDATION_ERROR'),
  tenantNotFound: () =>
    errorResponse('Tenant not found', 404, 'TENANT_NOT_FOUND'),
  invalidTenant: () =>
    errorResponse('Invalid tenant', 400, 'INVALID_TENANT'),
}

/**
 * Wrap async route handler with error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  return handler().catch((error) => {
    console.error('API Error:', error)
    return ApiErrors.internalError(
      process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    ) as NextResponse<ApiResponse<T>>
  })
}
