import { ensureCsrfToken } from '@/lib/csrf';

/**
 * CSRF Token Input Component
 *
 * Add this component to all forms that make state-changing requests (POST, PUT, PATCH, DELETE)
 *
 * Usage:
 * ```tsx
 * <form action="/api/posts" method="post">
 *   <CsrfInput />
 *   <input name="title" />
 *   <button type="submit">Submit</button>
 * </form>
 * ```
 */
export async function CsrfInput() {
  const token = await ensureCsrfToken();

  return (
    <input
      type="hidden"
      name="csrf_token"
      value={token}
    />
  );
}
