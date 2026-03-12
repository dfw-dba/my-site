const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? "";
const CLIENT_ID = import.meta.env.VITE_COGNITO_APP_CLIENT_ID ?? "";

export const isCognitoConfigured = Boolean(USER_POOL_ID && CLIENT_ID);

// Lazily loaded Cognito SDK — only imported when Cognito is actually configured.
// This avoids loading the SDK (which requires Node.js Buffer polyfill) in local dev.
async function getCognitoSDK() {
  const sdk = await import("amazon-cognito-identity-js");
  return sdk;
}

let userPoolPromise: Promise<InstanceType<
  Awaited<ReturnType<typeof getCognitoSDK>>["CognitoUserPool"]
>> | null = null;

function getUserPool() {
  if (!userPoolPromise) {
    userPoolPromise = getCognitoSDK().then(
      (sdk) =>
        new sdk.CognitoUserPool({
          UserPoolId: USER_POOL_ID,
          ClientId: CLIENT_ID,
        })
    );
  }
  return userPoolPromise;
}

export interface SignInResult {
  success: boolean;
  challenge?: "NEW_PASSWORD_REQUIRED" | "MFA_REQUIRED";
  cognitoUser?: unknown;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  if (!isCognitoConfigured) {
    throw new Error("Cognito is not configured");
  }

  const sdk = await getCognitoSDK();
  const pool = await getUserPool();
  const user = new sdk.CognitoUser({ Username: email, Pool: pool });
  const authDetails = new sdk.AuthenticationDetails({
    Username: email,
    Password: password,
  });

  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: () => {
        resolve({ success: true });
      },
      onFailure: (err: Error) => {
        reject(err);
      },
      newPasswordRequired: () => {
        resolve({ success: false, challenge: "NEW_PASSWORD_REQUIRED", cognitoUser: user });
      },
      totpRequired: () => {
        resolve({ success: false, challenge: "MFA_REQUIRED", cognitoUser: user });
      },
      mfaRequired: () => {
        resolve({ success: false, challenge: "MFA_REQUIRED", cognitoUser: user });
      },
    });
  });
}

export async function completeNewPassword(
  cognitoUser: unknown,
  newPassword: string
): Promise<SignInResult> {
  const user = cognitoUser as Awaited<ReturnType<typeof getCognitoSDK>>["CognitoUser"]["prototype"];

  return new Promise((resolve, reject) => {
    user.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: () => {
        resolve({ success: true });
      },
      onFailure: (err: Error) => {
        reject(err);
      },
      totpRequired: () => {
        resolve({ success: false, challenge: "MFA_REQUIRED", cognitoUser });
      },
      mfaRequired: () => {
        resolve({ success: false, challenge: "MFA_REQUIRED", cognitoUser });
      },
    });
  });
}

export async function verifyMFA(cognitoUser: unknown, code: string): Promise<void> {
  const user = cognitoUser as Awaited<ReturnType<typeof getCognitoSDK>>["CognitoUser"]["prototype"];

  return new Promise((resolve, reject) => {
    user.sendMFACode(
      code,
      {
        onSuccess: () => resolve(),
        onFailure: (err: Error) => reject(err),
      },
      "SOFTWARE_TOKEN_MFA"
    );
  });
}

export async function getCurrentSession() {
  if (!isCognitoConfigured) return null;

  const pool = await getUserPool();
  const user = pool.getCurrentUser();
  if (!user) return null;

  return new Promise<{ getIdToken: () => { getJwtToken: () => string; decodePayload: () => Record<string, unknown> } } | null>((resolve) => {
    user.getSession((err: Error | null, session: { isValid: () => boolean; getIdToken: () => { getJwtToken: () => string; decodePayload: () => Record<string, unknown> } } | null) => {
      if (err || !session?.isValid()) {
        resolve(null);
      } else {
        resolve(session);
      }
    });
  });
}

export async function getIdToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.getIdToken().getJwtToken() ?? null;
}

export async function signOut(): Promise<void> {
  if (!isCognitoConfigured) return;
  const pool = await getUserPool();
  const user = pool.getCurrentUser();
  user?.signOut();
}
