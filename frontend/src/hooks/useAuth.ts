import { useState, useEffect, useCallback } from "react";
import type { AuthState } from "../types";
import {
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  completeNewPassword as cognitoCompleteNewPassword,
  verifyMFA as cognitoVerifyMFA,
  getCurrentSession,
  isCognitoConfigured,
} from "../services/auth";

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: !isCognitoConfigured,
    isLoading: isCognitoConfigured,
    user: null,
    error: null,
  });

  const [pendingUser, setPendingUser] = useState<unknown>(null);

  useEffect(() => {
    if (!isCognitoConfigured) return;

    getCurrentSession().then((session) => {
      if (session) {
        const payload = session.getIdToken().decodePayload();
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: { email: payload["email"] as string },
          error: null,
        });
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
      }
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, error: null, isLoading: true }));
    try {
      const result = await cognitoSignIn(email, password);
      if (result.success) {
        const session = await getCurrentSession();
        const payload = session?.getIdToken().decodePayload();
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: { email: payload?.["email"] as string },
          error: null,
        });
        setPendingUser(null);
        return undefined;
      }
      setPendingUser(result.cognitoUser ?? null);
      setState((s) => ({ ...s, isLoading: false }));
      return result.challenge;
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Login failed",
      }));
      return undefined;
    }
  }, []);

  const completeNewPassword = useCallback(
    async (newPassword: string) => {
      if (!pendingUser) return undefined;
      setState((s) => ({ ...s, error: null, isLoading: true }));
      try {
        const result = await cognitoCompleteNewPassword(pendingUser, newPassword);
        if (result.success) {
          const session = await getCurrentSession();
          const payload = session?.getIdToken().decodePayload();
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: { email: payload?.["email"] as string },
            error: null,
          });
          setPendingUser(null);
          return undefined;
        }
        setState((s) => ({ ...s, isLoading: false }));
        return result.challenge;
      } catch (err) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : "Password change failed",
        }));
        return undefined;
      }
    },
    [pendingUser]
  );

  const submitMFA = useCallback(
    async (code: string) => {
      if (!pendingUser) return;
      setState((s) => ({ ...s, error: null, isLoading: true }));
      try {
        await cognitoVerifyMFA(pendingUser, code);
        const session = await getCurrentSession();
        const payload = session?.getIdToken().decodePayload();
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: { email: payload?.["email"] as string },
          error: null,
        });
        setPendingUser(null);
      } catch (err) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : "MFA verification failed",
        }));
      }
    },
    [pendingUser]
  );

  const logout = useCallback(async () => {
    await cognitoSignOut();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
    setPendingUser(null);
  }, []);

  return {
    ...state,
    login,
    logout,
    completeNewPassword,
    submitMFA,
  };
}
