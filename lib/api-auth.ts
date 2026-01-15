import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE } from '@/lib/auth';
import type { Role } from '@prisma/client';
import { isAgencyAdmin, isClientRole } from '@/lib/roles';

export interface AuthenticatedRequest {
  userId: string;
  role: Role;
  tenantIds: string[];
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
  };
}

/**
 * Verify that the user is authenticated
 * Returns the authenticated user session or throws an error
 */
export async function requireAuth(): Promise<AuthenticatedRequest> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const session = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        select: {
          role: true,
          memberships: {
            select: { tenantId: true }
          }
        }
      }
    }
  });

  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  return {
    userId: session.userId,
    role: session.user.role,
    tenantIds: session.user.memberships.map(m => m.tenantId),
    session: {
      id: session.id,
      token: session.token,
      userId: session.userId,
      expiresAt: session.expiresAt
    }
  };
}

/**
 * Verify that the user has access to the specified tenant
 */
export function requireTenantAccess(auth: AuthenticatedRequest, tenantId: string | null | undefined): void {
  if (!tenantId) {
    throw new Error('TENANT_REQUIRED');
  }

  if (isAgencyAdmin(auth.role)) {
    return;
  }

  if (!auth.tenantIds.includes(tenantId)) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Verify that the user has access to the specified tenant AND that the tenant is active
 * For client users, inactive tenants are not accessible
 */
export async function requireActiveTenantAccess(
  auth: AuthenticatedRequest,
  tenantId: string | null | undefined
): Promise<void> {
  requireTenantAccess(auth, tenantId);

  // Agency admins can access inactive tenants
  if (isAgencyAdmin(auth.role)) {
    return;
  }

  // For non-admins, check if tenant is active
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId! },
    select: { active: true }
  });

  if (!tenant || !tenant.active) {
    throw new Error('TENANT_INACTIVE');
  }
}

export function requireAgency(auth: AuthenticatedRequest): void {
  if (isClientRole(auth.role)) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Handle API errors with proper HTTP status codes
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof Error) {
    switch (error.message) {
      case 'UNAUTHORIZED':
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      case 'FORBIDDEN':
        return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
      case 'TENANT_INACTIVE':
        return NextResponse.json({ error: 'This client account is currently inactive' }, { status: 403 });
      case 'TENANT_REQUIRED':
        return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
      case 'INVALID_INPUT':
        return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
      case 'NOT_FOUND':
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
      case 'CSRF_INVALID':
        return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
      case 'RATE_LIMIT_EXCEEDED':
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      case 'MODULE_DISABLED':
        return NextResponse.json({ error: 'Module désactivé pour cet espace' }, { status: 403 });
      case 'INVALID_TRANSITION':
        return NextResponse.json({ error: 'Transition invalide' }, { status: 400 });
      default:
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  console.error('Unknown error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/**
 * Wrapper for authenticated API routes
 */
export function withAuth<T extends any[]>(
  handler: (auth: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const auth = await requireAuth();
      return await handler(auth, ...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
