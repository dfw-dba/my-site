import { useState, type FormEvent } from "react";
import { useAuthContext } from "../../contexts/AuthContext";

type LoginStep = "credentials" | "new-password" | "mfa" | "mfa-setup";

export default function Login() {
  const { login, completeNewPassword, submitMFA, setupMFA, mfaSecret, error, isLoading } = useAuthContext();

  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSetupCode, setMfaSetupCode] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const challenge = await login(email, password);
    if (challenge === "NEW_PASSWORD_REQUIRED") setStep("new-password");
    else if (challenge === "MFA_REQUIRED") setStep("mfa");
    else if (challenge === "MFA_SETUP") setStep("mfa-setup");
  }

  async function handleNewPassword(e: FormEvent) {
    e.preventDefault();
    const challenge = await completeNewPassword(newPassword);
    if (challenge === "MFA_REQUIRED") setStep("mfa");
    else if (challenge === "MFA_SETUP") setStep("mfa-setup");
  }

  async function handleMFA(e: FormEvent) {
    e.preventDefault();
    await submitMFA(mfaCode);
  }

  async function handleMFASetup(e: FormEvent) {
    e.preventDefault();
    await setupMFA(mfaSetupCode);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm rounded-lg bg-gray-800 p-8 shadow-lg">
        <h1 className="mb-6 text-center text-xl font-semibold text-white">Admin Login</h1>

        {error && (
          <div className="mb-4 rounded bg-red-900/50 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {step === "credentials" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="mt-1 w-full rounded bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {step === "new-password" && (
          <form onSubmit={handleNewPassword} className="space-y-4">
            <p className="text-sm text-gray-400">Please set a new password.</p>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-300">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="mt-1 w-full rounded bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Updating..." : "Set Password"}
            </button>
          </form>
        )}

        {step === "mfa-setup" && (
          <form onSubmit={handleMFASetup} className="space-y-4">
            <p className="text-sm text-gray-400">
              Set up your authenticator app. Add the secret key below to your authenticator app
              (e.g. Google Authenticator, Authy), then enter the 6-digit code.
            </p>
            {mfaSecret && (
              <div>
                <label className="block text-sm font-medium text-gray-300">Secret Key</label>
                <code className="mt-1 block w-full select-all break-all rounded bg-gray-700 px-3 py-2 text-sm text-green-300">
                  {mfaSecret}
                </code>
              </div>
            )}
            <div>
              <label htmlFor="mfa-setup-code" className="block text-sm font-medium text-gray-300">
                Verification Code
              </label>
              <input
                id="mfa-setup-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={mfaSetupCode}
                onChange={(e) => setMfaSetupCode(e.target.value)}
                required
                autoComplete="one-time-code"
                className="mt-1 w-full rounded bg-gray-700 px-3 py-2 text-center text-lg tracking-widest text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Verify & Complete Setup"}
            </button>
          </form>
        )}

        {step === "mfa" && (
          <form onSubmit={handleMFA} className="space-y-4">
            <p className="text-sm text-gray-400">
              Enter the code from your authenticator app.
            </p>
            <div>
              <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-300">
                MFA Code
              </label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                autoComplete="one-time-code"
                className="mt-1 w-full rounded bg-gray-700 px-3 py-2 text-center text-lg tracking-widest text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
