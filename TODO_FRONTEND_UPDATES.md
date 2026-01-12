# Frontend Updates Required

## CSRF Token Integration

All forms making POST/PUT/PATCH/DELETE requests need to include the CSRF token component.

### Files that need updating:

#### 1. Login Page
**File**: `app/(auth)/login/page.tsx`

Add to all forms:
```tsx
import { CsrfInput } from '@/components/csrf-input';

<form action="/api/auth/login" method="post">
  <CsrfInput />
  {/* existing form fields */}
</form>
```

#### 2. Jobs Page
**File**: `app/(dashboard)/jobs/page.tsx`

Add to job retry forms:
```tsx
import { CsrfInput } from '@/components/csrf-input';

<form action="/api/jobs/retry" method="post">
  <CsrfInput />
  {/* existing form fields */}
</form>
```

#### 3. Dashboard Layout
**File**: `app/(dashboard)/layout.tsx`

Add to logout form:
```tsx
import { CsrfInput } from '@/components/csrf-input';

<form action="/api/auth/logout" method="post">
  <CsrfInput />
  {/* existing form fields */}
</form>
```

#### 4. Post Detail Page
**File**: `app/(dashboard)/posts/[id]/page.tsx`

Add to ALL forms (update post, add comment, add checklist, etc.):
```tsx
import { CsrfInput } from '@/components/csrf-input';

{/* Post update form */}
<form action={`/api/posts/${post.id}`} method="post">
  <CsrfInput />
  {/* existing form fields */}
</form>

{/* Comment form */}
<form action="/api/comments" method="post">
  <CsrfInput />
  {/* existing form fields */}
</form>

{/* Checklist form */}
<form action="/api/checklists" method="post">
  <CsrfInput />
  {/* existing form fields */}
</form>

{/* Job forms */}
<form action="/api/jobs" method="post">
  <CsrfInput />
  {/* existing form fields */}
</form>
```

#### 5. New Post Page
**File**: `app/(dashboard)/posts/new/page.tsx`

Add to post creation form:
```tsx
import { CsrfInput } from '@/components/csrf-input';

<form action="/api/posts" method="post">
  <CsrfInput />
  {/* existing form fields */}
</form>
```

## Error Handling Updates

### Update Error Messages

Add handling for new error responses:

```tsx
// Example error handling
async function handleFormSubmit(e: FormEvent) {
  e.preventDefault();
  const formData = new FormData(e.target as HTMLFormElement);

  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();

      switch (response.status) {
        case 401:
          // Redirect to login
          window.location.href = '/login?message=Session+expired';
          break;
        case 403:
          if (error.error.includes('CSRF')) {
            alert('Security token expired. Please refresh the page.');
            window.location.reload();
          } else {
            alert('You do not have permission to perform this action.');
          }
          break;
        case 429:
          alert('Too many requests. Please slow down and try again in a few minutes.');
          break;
        default:
          alert(error.error || 'An error occurred');
      }

      return;
    }

    // Success handling
    const data = await response.json();
    // ... handle success
  } catch (error) {
    console.error('Request failed:', error);
    alert('Network error. Please check your connection.');
  }
}
```

## JavaScript Fetch/Axios Updates

If using fetch or axios for API calls, include CSRF token:

### Using Fetch

```typescript
// Get CSRF token from cookie
function getCsrfToken(): string | null {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return value;
    }
  }
  return null;
}

// Include in requests
const csrfToken = getCsrfToken();

await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'x-csrf-token': csrfToken || '',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

### Using Axios

```typescript
import axios from 'axios';

// Create axios instance with CSRF token
const api = axios.create({
  baseURL: '/api',
  headers: {
    'x-csrf-token': getCsrfToken() || ''
  }
});

// Use for all requests
await api.post('/endpoint', data);
```

## Session Management

### Add Session Expiry Handling

```typescript
// Check if session is still valid
async function checkSession() {
  try {
    const response = await fetch('/api/session/check');
    if (response.status === 401) {
      // Session expired, redirect to login
      window.location.href = '/login?message=Session+expired';
    }
  } catch (error) {
    console.error('Session check failed:', error);
  }
}

// Check session periodically (e.g., every 5 minutes)
setInterval(checkSession, 5 * 60 * 1000);
```

## Rate Limit Feedback

### Show User-Friendly Messages

```typescript
function handleRateLimitError(resetAt?: number) {
  if (resetAt) {
    const minutes = Math.ceil((resetAt - Date.now()) / 60000);
    alert(`Too many requests. Please wait ${minutes} minute(s) before trying again.`);
  } else {
    alert('Too many requests. Please wait a moment before trying again.');
  }
}

// In fetch error handling
if (response.status === 429) {
  const data = await response.json();
  handleRateLimitError(data.resetAt);
}
```

## File Upload Updates

### Add Client-Side Validation

```typescript
function validateFileUpload(file: File): string | null {
  // Check file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return 'File size must be less than 10MB';
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'application/pdf'
  ];

  if (!allowedTypes.includes(file.type)) {
    return `File type ${file.type} is not allowed`;
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.pdf'];
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    return `File extension ${extension} is not allowed`;
  }

  return null;
}

// Usage in form
function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  const error = validateFileUpload(file);
  if (error) {
    alert(error);
    e.target.value = ''; // Clear the input
    return;
  }

  // Proceed with upload
}
```

## Testing Checklist

Before considering the frontend updates complete:

- [ ] All forms include `<CsrfInput />`
- [ ] All fetch/axios calls include CSRF token in header
- [ ] 401 errors redirect to login
- [ ] 403 errors show appropriate messages
- [ ] 429 errors show rate limit message
- [ ] File upload shows validation errors
- [ ] Session expiry is handled gracefully
- [ ] Error messages are user-friendly

## Quick Start Command

To find all forms that might need updating:

```bash
# Find all forms in the app directory
grep -r "<form" app --include="*.tsx" --include="*.jsx"

# Find all fetch calls
grep -r "fetch(" app --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js"

# Find all axios calls
grep -r "axios\." app --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js"
```

## Priority Order

1. **High Priority**: Add `<CsrfInput />` to all forms (prevents CSRF attacks)
2. **High Priority**: Update error handling for 401/403 responses
3. **Medium Priority**: Add client-side file upload validation
4. **Medium Priority**: Add rate limit feedback
5. **Low Priority**: Add session expiry checks

## Questions?

- See `MIGRATION_GUIDE.md` for detailed examples
- See `SECURITY.md` for security documentation
- Report issues on GitHub
