import { NextResponse } from 'next/server';

// Deprecated: With Firebase session cookies we usually just re-login after 14 days.
// Keeping endpoint returning 410 Gone for any legacy client code.
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Refresh endpoint deprecated. Session cookie auto-validates until expiry.' },
    { status: 410 }
  );
}
