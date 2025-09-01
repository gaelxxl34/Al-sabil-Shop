// Middleware temporarily disabled to fix login functionality
// TODO: Re-implement admin protection after login is working properly

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
