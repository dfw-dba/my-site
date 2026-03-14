# Fix: Admin login redirects back to login screen

## Context

When a user enters their email and temporary Cognito password and clicks Sign In, they are immediately "redirected" back to the credentials form. The underlying problem is that `ProtectedRoute` unmounts `<Login />` during authentication, causing its local state (the current step in the multi-step login flow) to be lost.

## Root Cause

1. User clicks Sign In -> `login()` in `useAuth.ts` sets `isLoading: true`
2. `ProtectedRoute` checks `isLoading` first -> renders spinner -> **unmounts** `<Login />`
3. Cognito returns a challenge (e.g. `NEW_PASSWORD_REQUIRED`) -> hook sets `isLoading: false`, `isAuthenticated: false`
4. `ProtectedRoute` sees `!isAuthenticated` -> mounts a **fresh** `<Login />`
5. Fresh `Login` has `step = "credentials"` -> user sees the credentials form again, never the challenge step

The same issue also affects `completeNewPassword` when it returns a follow-up challenge (MFA_SETUP).

## Fix

Separate "initial session check" loading (`isInitializing`) from "operation in progress" loading (`isLoading`). ProtectedRoute should only show the spinner during the initial session check, not during login operations.

### Files modified

1. **`frontend/src/types/index.ts`** - Added `isInitializing` to `AuthState`
2. **`frontend/src/hooks/useAuth.ts`** - Split loading states: `isInitializing` for session check, `isLoading` for operations
3. **`frontend/src/components/admin/ProtectedRoute.tsx`** - Check `isInitializing` instead of `isLoading` for spinner
4. **`frontend/src/pages/admin/Login.tsx`** - No changes needed (already uses `isLoading` for button disabled state)

### Why this works

- During initial page load: `isInitializing` is true -> spinner shows -> session check completes -> `isInitializing` becomes false -> Login or Outlet renders
- During login flow: `isLoading` toggles but `isInitializing` stays false -> ProtectedRoute keeps rendering `<Login />` (never unmounts it) -> Login's local `step` state is preserved -> user sees the correct challenge step

## Verification

1. `cd frontend && npx tsc --noEmit` - type check passes
2. `cd frontend && npx vitest run` - tests pass
3. Manual test: navigate to /admin, enter email + temp password, click Sign In -> should see "Please set a new password" step (not redirect to credentials)
4. After setting new password -> should see MFA setup step
5. After MFA setup -> should land on admin dashboard
