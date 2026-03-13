# Fix Admin Login: Add Missing MFA Setup Flow

## Context

When attempting to log in to the admin portal with a temporary password, the user gets stuck after setting their new password. The Cognito user pool has MFA **required** (`ON`), but the frontend has no flow for first-time TOTP device association. After `completeNewPasswordChallenge`, Cognito returns an `MFA_SETUP` challenge (distinct from `MFA_REQUIRED`), but there's no `mfaSetup` callback handler — so the promise never resolves, the UI hangs on "Updating...", and the user refreshes back to login.

The code correctly handles `totpRequired`/`mfaRequired` (verifying an already-configured authenticator) but is missing the `mfaSetup` path (first-time TOTP device association: get secret → show to user → verify code).

## Files to Modify

1. **`frontend/src/services/auth.ts`** — Add `mfaSetup` callbacks and new functions
2. **`frontend/src/hooks/useAuth.ts`** — Add MFA setup state and methods
3. **`frontend/src/pages/admin/Login.tsx`** — Add "mfa-setup" step UI
4. **`frontend/src/types/index.ts`** — No changes needed (AuthState is sufficient)

## Implementation

### 1. `frontend/src/services/auth.ts`

- Add `"MFA_SETUP"` to the `SignInResult.challenge` union type
- Add `secretCode?: string` to `SignInResult` (the TOTP secret for the user to scan)
- In `signIn()` callback object: add `mfaSetup` handler that calls `user.associateSoftwareToken()` to get the secret, then resolves with `{ success: false, challenge: "MFA_SETUP", cognitoUser: user, secretCode }`
- In `completeNewPassword()` callback object: add same `mfaSetup` handler
- Add new exported function `verifyTOTPSetup(cognitoUser, code)`:
  - Calls `user.verifySoftwareToken(code, 'My Site', callbacks)`
  - On success: resolves (authentication complete)
  - On failure: rejects with error

### 2. `frontend/src/hooks/useAuth.ts`

- Add `mfaSecret` state (`string | null`) to hold the TOTP secret for display
- Update `login()`: handle `"MFA_SETUP"` challenge — store secret from result, return `"MFA_SETUP"`
- Update `completeNewPassword()`: handle `"MFA_SETUP"` challenge — store secret, return `"MFA_SETUP"`
- Add new `setupMFA(code: string)` method:
  - Calls `verifyTOTPSetup(pendingUser, code)` from auth service
  - On success: fetch session, set authenticated state, clear pendingUser and mfaSecret
  - On error: set error message
- Export `mfaSecret` and `setupMFA` from hook return

### 3. `frontend/src/pages/admin/Login.tsx`

- Add `"mfa-setup"` to the `LoginStep` union type
- Destructure `setupMFA` and `mfaSecret` from `useAuthContext()`
- Add `mfaSetupCode` state for the verification input
- Update `handleLogin`: add `else if (challenge === "MFA_SETUP") setStep("mfa-setup")`
- Update `handleNewPassword`: add `else if (challenge === "MFA_SETUP") setStep("mfa-setup")`
- Add `handleMFASetup` form handler: calls `setupMFA(mfaSetupCode)`
- Add new UI step `"mfa-setup"` that shows:
  - Instructions to open authenticator app
  - The TOTP secret key (from `mfaSecret`) displayed as selectable text for manual entry
  - A `otpauth://` URI formatted for QR code compatibility (optional: show as text the user can paste into their authenticator)
  - Input field for the 6-digit verification code
  - "Verify & Complete Setup" button

## Verification

1. **Reset user to test again**: Run `aws cognito-idp admin-set-user-password` to set a new temp password (resets to FORCE_CHANGE_PASSWORD)
2. **Build and test locally**: `cd frontend && npm run dev` — navigate to `/admin`
3. **Test flow**:
   - Enter email + temp password → should see "Set New Password" form
   - Enter new password → should see MFA setup with TOTP secret
   - Add secret to authenticator app, enter code → should authenticate and show admin dashboard
4. **Run type check**: `cd frontend && npx tsc --noEmit`
5. **Run tests**: `cd frontend && npx vitest run`
6. **Test existing MFA login** (after setup): Sign out, sign back in → should prompt for MFA code (not setup), verify it works
