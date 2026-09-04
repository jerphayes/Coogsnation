import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MemberMfaLoginChallenge({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        "/api/auth/login-mfa",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        },
      );

      const data =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to verify two-factor authentication",
        );
      }

      onSuccess();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to verify two-factor authentication",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
      <h3 className="font-bold text-gray-950">
        Two-Factor Authentication
      </h3>

      <p className="mt-1 text-sm text-gray-700">
        Enter the 6-digit code from your authenticator
        app or one of your recovery codes.
      </p>

      <Input
        className="mt-4"
        value={token}
        onChange={(event) =>
          setToken(
            event.target.value
              .toUpperCase()
              .slice(0, 40),
          )
        }
        autoFocus
        autoComplete="one-time-code"
        placeholder="Authenticator or recovery code"
      />

      {error && (
        <p className="mt-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <Button
        type="button"
        className="mt-3 w-full bg-red-700 text-white hover:bg-red-800"
        disabled={busy || token.trim().length < 6}
        onClick={verify}
      >
        {busy ? "VERIFYING…" : "VERIFY & SIGN IN"}
      </Button>
    </div>
  );
}
