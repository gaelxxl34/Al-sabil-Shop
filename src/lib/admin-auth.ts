// src/lib/admin-auth.ts
// Minimal admin auth helpers using role cookie + server validation on demand
export function getUserRoleFromCookie(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    document.cookie
      .split('; ')
      .find(r => r.startsWith('user-role='))
      ?.split('=')[1] || null
  );
}

export function isAdminClientSide(): boolean {
  return getUserRoleFromCookie() === 'admin';
}

export async function assertAdminServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.user?.role === 'admin';
  } catch {
    return false;
  }
}

export function redirectToLoginIfNotAdmin(): void {
  if (typeof window === 'undefined') return;
  // Fast check via cookie, deeper check can happen in page effects
  if (!isAdminClientSide()) {
    window.location.href = '/login';
  }
}
