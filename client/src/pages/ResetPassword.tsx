import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

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
  const [identifier, setIdentifier] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
                <Link href="/login/email">
                  <Button className="w-full bg-uh-red hover:bg-red-700">Return to login</Button>
                </Link>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="reset-identifier">Email or member handle</Label>
                  <Input
                    id="reset-identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    autoComplete="username"
                    required
                    disabled={step !== "request"}
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
                    <div className="space-y-2">
                      <Label htmlFor="reset-new-password">New password</Label>
                      <Input
                        id="reset-new-password"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-confirm-password">Confirm new password</Label>
                      <Input
                        id="reset-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        required
                      />
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
