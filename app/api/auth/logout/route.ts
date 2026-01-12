import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { requireCsrfToken } from '@/lib/csrf';

export async function POST(req: Request) {
  try {
    // CSRF protection for logout
    await requireCsrfToken(req);

    await destroySession();
    return NextResponse.redirect(new URL('/login', req.url));
  } catch (error) {
    if (error instanceof Error && error.message === 'CSRF_INVALID') {
      return NextResponse.redirect(
        new URL('/login?message=Session+invalide.+Veuillez+vous+reconnecter', req.url)
      );
    }

    console.error('Logout error:', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}
