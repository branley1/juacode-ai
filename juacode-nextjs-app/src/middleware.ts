import { NextResponse, NextRequest } from 'next/server';

// Apply this middleware only to /api routes
export const config = {
  matcher: '/api/:path*',
};

export function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    const origin = request.headers.get('origin') || '*';
    const reqHeaders = request.headers.get('access-control-request-headers') || 'Content-Type, Authorization';

    preflight.headers.set('Access-Control-Allow-Origin', origin);
    preflight.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    preflight.headers.set('Access-Control-Allow-Headers', reqHeaders);
    preflight.headers.set('Access-Control-Max-Age', '86400');
    return preflight;
  }

  // For all other requests, add the CORS headers to the response
  const response = NextResponse.next();
  const origin = request.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
} 