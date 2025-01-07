// lib/api-error-handling.ts
import { NextRequest, NextResponse } from 'next/server';

interface APIErrorResponse {
  error: string;
  details?: string;
  status?: number;
}

export async function handleLLMRequest(
  url: string, 
  options: RequestInit, 
  retries = 3, 
  backoffMs = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < retries) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Check if it's a rate limit error (429) or server error (500+)
      if (response.status === 429 || response.status >= 500) {
        const error = await response.json();
        throw new Error(error.error || `Server error: ${response.status}`);
      }

      // For any other error responses
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
      }

      return response;

    } catch (error: any) {
      lastError = error;
      attempt++;

      // Only retry on network errors, rate limits, or server errors
      if (!error.message.includes('fetch failed') && 
          !error.message.includes('rate limit') &&
          !error.message.includes('Server error')) {
        break;
      }

      if (attempt < retries) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 200;
        const delay = (backoffMs * Math.pow(2, attempt)) + jitter;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(lastError?.message || 'Failed to get response from LLM after retries');
}

export function validateRequestBody(body: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!body[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: string
): NextResponse {
  return NextResponse.json(
    { 
      error: message,
      details: details 
    },
    { status }
  );
}

export function createValidationError(field: string): NextResponse {
  return createErrorResponse(
    `Invalid or missing ${field}`,
    400,
    `The ${field} field is required and must be valid`
  );
}

export async function withErrorHandling(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error: any) {
    console.error('Request error:', error);
    
    // Handle known error types
    if (error.name === 'ValidationError') {
      return createErrorResponse(error.message, 400);
    }
    
    // Handle API-specific errors
    if (error.status && error.message) {
      return createErrorResponse(error.message, error.status);
    }
    
    // Generic error handling
    return createErrorResponse(
      'An unexpected error occurred',
      500,
      error.message
    );
  }
}

export async function validateApiKey(
  provider: string,
  apiKey?: string
): Promise<boolean> {
  if (!apiKey) return false;

  // Add provider-specific validation logic here
  switch (provider) {
    case 'anthropic':
      return apiKey.startsWith('sk-');
    case 'openai':
      return apiKey.startsWith('sk-');
    case 'voyage':
      return apiKey.startsWith('vg-');
    case 'pinecone':
      return apiKey.length > 0;
    default:
      return false;
  }
}

export function parseError(error: any): APIErrorResponse {
  if (typeof error === 'string') {
    return { error };
  }
  
  if (error instanceof Error) {
    return {
      error: error.message,
      details: error.stack
    };
  }
  
  return {
    error: 'An unexpected error occurred',
    details: JSON.stringify(error)
  };
}