import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import SecurePasswordGenerator from "@/components/SecurePasswordGenerator";

type Step = "request" | "verify" | "complete" | "done";

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || fallback;
  } catch {
    return fallback;
  }
}

export default function ResetPassword() {
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState(
    () =>
      new URLSearchParams(
        window.location.search,
      ).get("identifier") || "",
  );

  const lockedFromLogin =
    new URLSearchParams(
      window.location.search,
    ).get("locked") === "1";
  const [mfaToken, setMfaToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (step === "request") {
        const response = await apiRequest("POST", "/api/auth/password-reset/request", { identifier });
        setMessage(await responseMessage(response, "A verification code has been requested."));
        setStep("verify");
        return;
      }

      if (step === "verify") {
        const response = await apiRequest("POST", "/api/auth/password-reset/verify-mfa", {
          identifier,
          mfaToken,
        });
        setMessage(await responseMessage(response, "Verification code confirmed."));
        setStep("complete");
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("Passwords must match.");
        return;
      }

      const response = await apiRequest("POST", "/api/auth/password-reset/complete", {
        identifier,
        mfaToken,
        newPassword,
        confirmPassword,
      });
      setMessage(await responseMessage(response, "Password reset successful."));
      setStep("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.replace(/^\d+:\s*/, "") : "The request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto flex max-w-lg items-center px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
          </CardHeader>
          <CardContent>
            {step === "done" ? (
              <div className="space-y-4">
                <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                  {message}
                </p>
                <div
                  className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900"
                  data-testid="password-manager-update-warning"
                >
                  Important: Write down your new password and update your password manager, just in case it does not save or update automatically.
                </div>

                <Link href="/login/email">
                  <Button className="w-full bg-uh-red hover:bg-red-700">Return to login</Button>
                </Link>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={submit}>
                {lockedFromLogin && (
                  <div
                    role="alert"
                    className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
                  >
                    <p className="font-bold">
                      Account Temporarily Locked
                    </p>

                    <p className="mt-1">
                      Password login has been temporarily locked after three unsuccessful sign-in attempts. Account recovery is available now. Send a verification code to your registered email to reset your password.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reset-identifier">Email or member handle</Label>
                  <Input
                    id="reset-identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    name="username"
                    autoComplete="username"
                    required
                    readOnly={step !== "request"}
                    className={step !== "request" ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" : ""}
                  />
                </div>

                {step !== "request" && (
                  <div className="space-y-2">
                    <Label htmlFor="reset-code">Six-digit verification code</Label>
                    <Input
                      id="reset-code"
                      value={mfaToken}
                      onChange={(event) => setMfaToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      required
                      disabled={step === "complete"}
                    />
                  </div>
                )}

                {step === "complete" && (
                  <>
                    <SecurePasswordGenerator
                      onUse={(value) => {
                        setNewPassword(value);
                        setConfirmPassword(value);
                      }}
                    />

                    <div className="space-y-2">
                      <Label htmlFor="reset-new-password">New password</Label>
                      <div className="relative">
                        <Input
                          id="reset-new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          name="new-password"
                          autoComplete="new-password"
                          className="pr-12"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(v => !v)}
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          {showNewPassword
                            ? <EyeOff className="h-5 w-5" />
                            : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-confirm-password">Confirm new password</Label>
                      <div className="relative">
                        <Input
                          id="reset-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          name="confirm-password"
                          autoComplete="new-password"
                          className="pr-12"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(v => !v)}
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          {showConfirmPassword
                            ? <EyeOff className="h-5 w-5" />
                            : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {message && (
                  <p role="status" className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                    {message}
                  </p>
                )}
                {error && (
                  <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full bg-uh-red hover:bg-red-700" disabled={busy}>
                  {busy
                    ? "Working…"
                    : step === "request"
                      ? "Send verification code"
                      : step === "verify"
                        ? "Verify code"
                        : "Set new password"}
                </Button>

                <Link href="/login/email" className="block text-center text-sm text-uh-red hover:underline">
                  Back to login
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
