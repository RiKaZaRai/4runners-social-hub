# Security Migration Guide

This guide helps you understand the security changes and how to adapt your code.

## Breaking Changes

### 1. All API Routes Require Authentication

**Before:**
```typescript
export async function GET(req: Request) {
  const posts = await prisma.post.findMany();
  return NextResponse.json(posts);
}
```

**After:**
```typescript
import { requireAuth, requireTenantAccess, handleApiError } from '@/lib/api-auth';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    requireTenantAccess(auth, tenantId);

    const posts = await prisma.post.findMany({
      where: { tenantId: tenantId! }
    });

    return NextResponse.json(posts);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 2. All Forms Must Include CSRF Token

**Before:**
```tsx
<form action="/api/posts" method="post">
  <input name="title" />
  <button type="submit">Submit</button>
</form>
```

**After:**
```tsx
import { CsrfInput } from '@/components/csrf-input';

<form action="/api/posts" method="post">
  <CsrfInput />
  <input name="title" />
  <button type="submit">Submit</button>
</form>
```

### 3. File Uploads Require Validation

**Before:**
```typescript
const file = form.get('file');
await uploadToS3(file);
```

**After:**
```typescript
import { validateFile, verifyFileSignature, generateStorageKey } from '@/lib/file-validation';

const file = form.get('file');

const validation = validateFile(file);
if (!validation.valid) {
  return NextResponse.json({ error: validation.error }, { status: 400 });
}

const signatureCheck = await verifyFileSignature(file);
if (!signatureCheck.valid) {
  return NextResponse.json({ error: signatureCheck.error }, { status: 400 });
}

const key = generateStorageKey(tenantId, file.name);
await uploadToS3(key, file);
```

### 4. Database Operations Should Use Transactions

**Before:**
```typescript
const post = await prisma.post.create({ data: {...} });
await prisma.postVersion.create({ data: {...} });
await prisma.auditLog.create({ data: {...} });
```

**After:**
```typescript
const post = await prisma.$transaction(async (tx) => {
  const newPost = await tx.post.create({ data: {...} });
  await tx.postVersion.create({ data: {...} });
  await tx.auditLog.create({ data: {...} });
  return newPost;
});
```

## New Features

### Rate Limiting

Rate limiting is automatically applied to all API routes. Different limits for different operations:

- Authentication: 5 requests per 15 minutes
- General API: 100 requests per minute
- File uploads: 10 requests per minute

### Session Cleanup

Schedule periodic cleanup of expired sessions:

```typescript
import { cleanupExpiredSessions } from '@/lib/auth';

// Run this via a cron job or scheduled task
await cleanupExpiredSessions();
```

### Audit Logging

All API routes now include audit logging:

```typescript
await tx.auditLog.create({
  data: {
    tenantId,
    action: 'post.create',
    entityType: 'post',
    entityId: post.id,
    payload: { title: post.title, userId: auth.userId }
  }
});
```

## Environment Variables

Update your `.env` file based on `.env.example`:

```bash
# Add these new variables
NODE_ENV="development"
SEED_ADMIN_PASSWORD="your-secure-password"
SEED_CLIENT_TOKEN="your-secure-token"
```

## Frontend Changes Needed

### 1. Add CSRF Token to All Forms

Every form that makes POST/PUT/PATCH/DELETE requests needs a CSRF token:

```tsx
import { CsrfInput } from '@/components/csrf-input';

// In your form component
<form action="/api/endpoint" method="post">
  <CsrfInput />
  {/* rest of form */}
</form>
```

### 2. Handle New Error Responses

API errors now return consistent formats:

```typescript
// 401 Unauthorized
{ error: 'Authentication required' }

// 403 Forbidden
{ error: 'Access denied to this tenant' }
{ error: 'CSRF token validation failed' }

// 400 Bad Request
{ error: 'tenantId is required' }
{ error: 'Invalid input data' }

// 404 Not Found
{ error: 'Resource not found' }

// 429 Too Many Requests
{ error: 'Too many requests. Please try again later.' }

// 500 Internal Server Error
{ error: 'Internal server error' }
```

### 3. Handle Rate Limiting

When rate limited, the API returns 429 status. Show appropriate message to users:

```typescript
const response = await fetch('/api/endpoint', { method: 'POST' });

if (response.status === 429) {
  alert('Too many requests. Please slow down and try again later.');
}
```

## Testing Your Changes

### 1. Verify Authentication

```bash
# Should fail with 401
curl http://localhost:3000/api/posts

# Should succeed after login
curl -H "Cookie: hub_session=YOUR_SESSION_TOKEN" \
  http://localhost:3000/api/posts?tenantId=TENANT_ID
```

### 2. Verify CSRF Protection

```bash
# Should fail with 403
curl -X POST http://localhost:3000/api/posts \
  -H "Cookie: hub_session=YOUR_SESSION_TOKEN" \
  -F "title=Test"

# Should succeed with CSRF token
curl -X POST http://localhost:3000/api/posts \
  -H "Cookie: hub_session=YOUR_SESSION_TOKEN" \
  -H "x-csrf-token=YOUR_CSRF_TOKEN" \
  -F "title=Test"
```

### 3. Verify Rate Limiting

```bash
# Make rapid requests - should eventually return 429
for i in {1..10}; do
  curl http://localhost:3000/api/auth/login -X POST \
    -F "email=test@test.com" \
    -F "password=test"
done
```

### 4. Verify Tenant Isolation

```bash
# Login as user A, try to access tenant B's data
# Should return 403 Forbidden
curl -H "Cookie: hub_session=USER_A_SESSION" \
  "http://localhost:3000/api/posts?tenantId=TENANT_B_ID"
```

## Rollback Plan

If you need to temporarily disable security features (NOT RECOMMENDED):

### Disable CSRF (INSECURE - for debugging only)

Comment out CSRF checks in API routes:

```typescript
// await requireCsrfToken(req);
```

### Disable Rate Limiting (INSECURE - for debugging only)

Comment out rate limit checks:

```typescript
// await requireRateLimit(auth.userId, 'api');
```

### Disable Authentication (VERY INSECURE - never do this in production)

Comment out auth checks:

```typescript
// const auth = await requireAuth();
// requireTenantAccess(auth, tenantId);
```

## Deployment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS (required for secure cookies)
- [ ] Set strong `SEED_ADMIN_PASSWORD` and `SEED_CLIENT_TOKEN`
- [ ] Verify all forms include `<CsrfInput />`
- [ ] Test authentication on all API routes
- [ ] Test tenant isolation
- [ ] Test file upload restrictions
- [ ] Test rate limiting
- [ ] Set up session cleanup cron job
- [ ] Review and tighten CSP headers if needed
- [ ] Enable error monitoring (Sentry, etc.)
- [ ] Set up audit log review process

## Getting Help

- Security documentation: `SECURITY.md`
- Report security issues: security@4runners.com
- General questions: Create an issue on GitHub
