/**
 * API VALIDATION AND ERROR HANDLING UTILITIES
 * Centralized validation and error handling for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Standard API error response format
 */
export interface APIError {
  success: false;
  error: string;
  details?: unknown;
  timestamp: string;
}

/**
 * Standard API success response format
 */
export interface APISuccess<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export type APIResponse<T = unknown> = APISuccess<T> | APIError;

/**
 * Application error codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
}

/**
 * Custom API error class
 */
export class APIErrorClass extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): NextResponse<APIError> {
  let statusCode = 500;
  let errorMessage = defaultMessage;
  let details: unknown = undefined;

  if (error instanceof APIErrorClass) {
    statusCode = error.statusCode;
    errorMessage = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    errorMessage = 'Validation error';
    details = error.issues.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  } else if (error instanceof Error) {
    errorMessage = error.message;
    // Log full error for debugging
    console.error('API Error:', error);
  }

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      details,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<APISuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Validate request body against a Zod schema
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw error;
    }
    throw new APIErrorClass(400, ErrorCode.BAD_REQUEST, 'Invalid JSON body');
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T {
  const searchParams = request.nextUrl.searchParams;
  const params: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    if (params[key]) {
      // Handle multiple values for same key
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });

  return schema.parse(params);
}

/**
 * Higher-order function to wrap API route handlers with error handling
 * Supports both regular routes and routes with path parameters
 */
export function withErrorHandler<T = unknown, TContext = unknown>(
  handler: (request: NextRequest, context?: TContext) => Promise<NextResponse<APISuccess<T>>>
) {
  return async (
    request: NextRequest,
    context?: TContext
  ): Promise<NextResponse<APIResponse<T>>> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * Check if a value is a valid MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Validate MongoDB ObjectId parameter
 */
export function validateObjectId(id: string, paramName: string = 'id'): void {
  if (!isValidObjectId(id)) {
    throw new APIErrorClass(
      400,
      ErrorCode.VALIDATION_ERROR,
      `Invalid ${paramName}: must be a valid MongoDB ObjectId`
    );
  }
}
