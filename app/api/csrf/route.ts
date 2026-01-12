import { NextResponse } from 'next/server';
import { ensureCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function GET(req: Request) {
  try {
    // Rate limiting to prevent token exhaustion attacks
    const clientId = getClientIdentifier(req);
    const rateLimit = await checkRateLimit(clientId, 'api');

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString()
          }
        }
      );
    }

    const token = await ensureCsrfToken();

    return NextResponse.json(
      { token },
      {
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        }
      }
    );
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
