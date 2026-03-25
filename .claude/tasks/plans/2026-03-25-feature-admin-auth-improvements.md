# Admin Portal: QR Code, Logout Button, Session Timeout

**Branch**: `feature/admin-auth-improvements`
**Status**: Planning

## Context

Three admin portal UX/security improvements:
1. MFA setup currently shows only a raw text secret — need a scannable QR code
2. No logout button exists anywhere in the UI — need one always visible in the sidebar
3. Cognito refresh token is 30 days — reduce to 5 days to require periodic re-login with MFA

## Changes

### 1. QR Code for MFA Setup
**File(s):** `frontend/src/pages/admin/Login.tsx`, `frontend/package.json`

- Install `qrcode.react` dependency
- In the `mfa-setup` step (lines 125-131), add a `<QRCodeSVG>` component above the existing secret text
- Build TOTP URI: `otpauth://totp/MySite:${email}?secret=${mfaSecret}&issuer=MySite`
- QR code uses `bgColor="#1f2937"` (gray-800) and `fgColor="#ffffff"` (white) for dark theme
- Keep the raw secret as a "Or enter manually:" fallback below the QR code

### 2. Logout Button in Sidebar Bottom-Left
**File(s):** `frontend/src/components/admin/AdminSidebar.tsx`

- Import `useAuthContext` from auth context
- Add a red-styled logout button below the existing "Back to Site" link in the bottom section (lines 79-89)
- Use a "door/arrow" logout icon SVG
- Respects collapsed state (icon-only when collapsed, same pattern as other items)
- Add `space-y-2` to parent div for spacing between Back to Site and Logout
- Red text (`text-red-400 hover:text-red-300`) for destructive action visual distinction

### 3. Session Timeout — 5 Day Refresh Token
**File(s):** `infrastructure/cdk/lib/data-stack.ts`

- Line 203: Change `refreshTokenValidity: cdk.Duration.days(30)` to `cdk.Duration.days(5)`
- Cognito enforces this server-side — after 5 days the refresh token expires, SDK auto-refresh fails, `getCurrentSession()` returns null, and `ProtectedRoute` redirects to login
- MFA is already required on every fresh login (`mfa: cognito.Mfa.REQUIRED` in CDK config)
- No frontend code changes needed — existing session check flow handles expired sessions gracefully
- Note: Existing sessions keep their 30-day tokens until they naturally expire

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `frontend/package.json` | Edit | Add `qrcode.react` dependency |
| `frontend/src/pages/admin/Login.tsx` | Edit | Add QR code SVG to MFA setup step |
| `frontend/src/components/admin/AdminSidebar.tsx` | Edit | Add logout button in bottom section |
| `infrastructure/cdk/lib/data-stack.ts` | Edit | Change refresh token from 30 to 5 days |

## Verification

1. `cd frontend && npm install` — install new dependency
2. `cd frontend && npx tsc --noEmit` — type check passes
3. `cd frontend && npx vitest run` — existing tests pass
4. Manual: navigate to MFA setup flow and verify QR code renders with correct TOTP URI
5. Manual: verify logout button appears in sidebar (both expanded and collapsed), clicking it logs out and shows login page
6. After CDK deploy: verify Cognito user pool client shows 5-day refresh token validity
