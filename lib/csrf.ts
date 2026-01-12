import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

/**
 * Generate a new CSRF token and set it as a cookie
 */
export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  });

  return token;
}

/**
 * Get the current CSRF token from cookies
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE)?.value || null;
}

/**
 * Ensure a CSRF token exists and return it
 */
export async function ensureCsrfToken(): Promise<string> {
  const token = await getCsrfToken();
  if (token) {
    return token;
  }
  return generateCsrfToken();
}

/**
 * Verify that the CSRF token in the request matches the one in the cookie
 */
export async function verifyCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;

  if (!cookieToken) {
    return false;
  }

  // Check header first, then form data
  const headerToken = request.headers.get(CSRF_HEADER);

  if (headerToken) {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  }

  // For form submissions, check the form data
  try {
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('multipart/form-data') || contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.clone().formData();
      const formToken = formData.get('csrf_token')?.toString();

      if (formToken) {
        return crypto.timingSafeEqual(
          Buffer.from(cookieToken),
          Buffer.from(formToken)
        );
      }
    }
  } catch (error) {
    console.error('Error verifying CSRF token from form:', error);
  }

  return false;
}

/**
 * Middleware to require CSRF token for state-changing operations
 */
export async function requireCsrfToken(request: Request): Promise<void> {
  const method = request.method;

  // Only require CSRF for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const isValid = await verifyCsrfToken(request);

    if (!isValid) {
      throw new Error('CSRF_INVALID');
    }
  }
}
