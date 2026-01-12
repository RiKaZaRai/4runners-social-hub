# Security Documentation

## Overview

This document describes the security measures implemented in the 4Runners Social Hub application.

## Recent Security Improvements

All critical security vulnerabilities have been addressed. The application now includes:

### 1. Authentication & Authorization

#### Multi-Tenant Authorization
- **Fixed**: All API routes now verify that the authenticated user has access to the requested tenant
- **Implementation**: `requireAuth()` and `requireTenantAccess()` functions in all API routes
- **Location**: `lib/api-auth.ts`

#### Session Security
- **Secure cookies**: `httpOnly`, `sameSite: strict`, `secure` flag in production
- **Strong tokens**: 256-bit cryptographically secure session tokens
- **Session cleanup**: Automatic cleanup of expired sessions via `cleanupExpiredSessions()`
- **Location**: `lib/auth.ts`

### 2. CSRF Protection

All state-changing operations (POST, PUT, PATCH, DELETE) are now protected against CSRF attacks.

#### Implementation
```typescript
// In API routes
import { requireCsrfToken } from '@/lib/csrf';

export async function POST(req: Request) {
  await requireCsrfToken(req); // Validates CSRF token
  // ... rest of handler
}
```

#### Usage in Forms
```tsx
import { CsrfInput } from '@/components/csrf-input';

<form action="/api/posts" method="post">
  <CsrfInput />
  {/* other form fields */}
</form>
```

The CSRF token can be sent via:
- Form field: `csrf_token`
- HTTP header: `x-csrf-token`

### 3. Rate Limiting

Protection against brute force attacks and API abuse.

#### Rate Limit Types
- `auth`: 5 requests per 15 minutes (login attempts)
- `api`: 100 requests per minute (general API)
- `upload`: 10 requests per minute (file uploads)
- `strict`: 30 requests per minute (sensitive operations)

#### Implementation
Uses Redis-backed sliding window rate limiting. Limits are enforced per user ID for authenticated requests, and per IP address for authentication endpoints.

### 4. File Upload Security

#### Validations
- **File size**: Maximum 10MB
- **File types**: Only allowed MIME types (images, videos, PDF)
- **File extensions**: Validated against whitelist
- **Magic bytes**: File content verified to match declared type
- **Filename sanitization**: Path traversal protection

#### Implementation
```typescript
import { validateFile, verifyFileSignature } from '@/lib/file-validation';

const validation = validateFile(file);
if (!validation.valid) {
  return NextResponse.json({ error: validation.error }, { status: 400 });
}

const signatureCheck = await verifyFileSignature(file);
if (!signatureCheck.valid) {
  return NextResponse.json({ error: signatureCheck.error }, { status: 400 });
}
```

### 5. Secure Asset Serving

- **Authorization checks**: Users can only access assets from their tenants
- **Content-Type validation**: Prevents XSS via malicious file uploads
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, CSP
- **Safe inline display**: Only safe image types displayed inline, others forced as downloads

### 6. Magic Link Authentication

- **No URL exposure**: Tokens no longer displayed in URLs
- **Secure tokens**: 256-bit cryptographically secure tokens
- **One-time use**: Tokens deleted after use
- **15-minute expiration**: Short-lived tokens
- **TODO**: Email delivery (currently logged to console in development)

### 7. Input Validation

- All API routes use Zod schemas for validation
- Type coercion removed (no more `as any`)
- Enum values validated against whitelists
- Email format validation
- Password strength requirements (minimum 8 characters)

### 8. Database Transactions

All multi-step operations wrapped in transactions to prevent race conditions and ensure data consistency:
- Post creation with versioning and audit logs
- Asset uploads with audit logs
- Job creation with audit logs

### 9. Security Headers

Configured in `next.config.mjs`:

- `Strict-Transport-Security`: Force HTTPS
- `X-Frame-Options`: Prevent clickjacking
- `X-Content-Type-Options`: Prevent MIME sniffing
- `X-XSS-Protection`: Enable XSS filter
- `Content-Security-Policy`: Restrict resource loading
- `Referrer-Policy`: Control referrer information
- `Permissions-Policy`: Disable unnecessary browser features

### 10. Error Handling

- Consistent error responses across all API routes
- Proper HTTP status codes
- No sensitive information leaked in errors
- Errors logged server-side for debugging

## Environment Variables

### Required for Production

```bash
# Database
DATABASE_URL="postgresql://..."

# Redis (for rate limiting and job queues)
REDIS_URL="redis://..."

# MinIO/S3 Storage
MINIO_ENDPOINT="https://..."
MINIO_ACCESS_KEY="..."
MINIO_SECRET_KEY="..."
MINIO_BUCKET="..."

# Seed Credentials (optional, generates random if not set)
SEED_ADMIN_PASSWORD="..."
SEED_CLIENT_TOKEN="..."

# Node Environment
NODE_ENV="production"
```

### Security Best Practices for Environment Variables

1. Never commit `.env` files to version control
2. Use different credentials for each environment
3. Rotate secrets regularly
4. Use secret management services in production (AWS Secrets Manager, HashiCorp Vault, etc.)

## Remaining Security Considerations

### 1. Email Delivery for Magic Links

**Current State**: Magic links are logged to console
**Required**: Integrate email service (SendGrid, AWS SES, etc.)

```typescript
// TODO: In app/api/auth/login/route.ts
// Replace console.log with actual email sending
await sendEmail({
  to: email,
  subject: 'Your magic link',
  text: `Click here to log in: ${magicLink}`
});
```

### 2. Account Lockout

**Recommended**: Implement account lockout after multiple failed login attempts

### 3. Two-Factor Authentication (2FA)

**Recommended**: Add TOTP-based 2FA for sensitive accounts

### 4. Audit Log Review

**Recommended**: Implement monitoring and alerting on audit logs for suspicious activity

### 5. Password Reset Flow

**Required**: Implement secure password reset functionality

### 6. Session Management UI

**Recommended**: Allow users to view and revoke active sessions

### 7. Content Security Policy (CSP)

**Current**: Basic CSP with `unsafe-inline` and `unsafe-eval` for Next.js compatibility
**Recommended**: Tighten CSP once app structure is finalized

## Security Testing

### Recommended Tests

1. **Penetration Testing**: Engage security professionals for penetration testing
2. **SAST**: Use Static Application Security Testing tools
3. **DAST**: Use Dynamic Application Security Testing tools
4. **Dependency Scanning**: Regularly update dependencies and scan for vulnerabilities

### Manual Testing Checklist

- [ ] Verify multi-tenant isolation (user A cannot access tenant B's data)
- [ ] Test CSRF protection on all forms
- [ ] Verify rate limiting on login and API endpoints
- [ ] Test file upload restrictions (size, type, malicious files)
- [ ] Verify session expiration and cleanup
- [ ] Test magic link expiration and one-time use
- [ ] Verify authorization on all API endpoints
- [ ] Test SQL injection resistance (Prisma provides this)
- [ ] Test XSS prevention in user-generated content

## Reporting Security Issues

If you discover a security vulnerability, please email security@4runners.com with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

Please do not publicly disclose security issues until they have been addressed.

## Compliance

### GDPR Considerations

- User data encryption at rest (PostgreSQL encryption)
- User data encryption in transit (HTTPS/TLS)
- Audit logs for data access
- Session management and logout
- TODO: Data export functionality
- TODO: Data deletion functionality (right to be forgotten)

### OWASP Top 10 Coverage

1. ✅ **Broken Access Control**: Fixed with proper authorization checks
2. ✅ **Cryptographic Failures**: Secure session tokens, password hashing
3. ✅ **Injection**: Prisma ORM prevents SQL injection
4. ✅ **Insecure Design**: Multi-layer security approach
5. ✅ **Security Misconfiguration**: Security headers, secure defaults
6. ⚠️ **Vulnerable and Outdated Components**: Regular updates needed
7. ✅ **Identification and Authentication Failures**: Session security, rate limiting
8. ✅ **Software and Data Integrity Failures**: Audit logs, transactions
9. ✅ **Security Logging and Monitoring Failures**: Audit logs implemented
10. ✅ **Server-Side Request Forgery (SSRF)**: Not applicable (no user-controlled URLs)

## Version History

### v2.0.0 (Current) - Security Hardening Release

- Fixed critical multi-tenant authorization vulnerability
- Added authentication to all API routes
- Implemented CSRF protection
- Added rate limiting
- Secured file uploads
- Added security headers
- Improved session security
- Fixed magic link exposure
- Added database transactions
- Enhanced input validation
- Removed hardcoded credentials
