import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { requireCsrfToken } from '@/lib/csrf';

// Helper function to create redirect URLs with correct domain
function redirectUrl(path: string): string {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
}

export async function POST(req: Request) {
  try {
    // CSRF protection for logout
    await requireCsrfToken(req);

    await destroySession();
    return NextResponse.redirect(redirectUrl('/login'));
  } catch (error) {
    if (error instanceof Error && error.message === 'CSRF_INVALID') {
      return NextResponse.redirect(
        redirectUrl('/login?message=Session+invalide.+Veuillez+vous+reconnecter')
      );
    }

    console.error('Logout error:', error);
    return NextResponse.redirect(redirectUrl('/login'));
  }
}
