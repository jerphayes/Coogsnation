import {
  useState,
} from "react";

import {
  KeyRound,
  ShieldCheck,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  apiRequest,
} from "@/lib/queryClient";

export interface AdminMfaStatus {
  configured: boolean;
  enabled: boolean;
  verified: boolean;
  requiresStepUp: boolean;
  isOwner: boolean;
  verifiedUntil: string | null;
  lockedUntil: string | null;
}

interface Enrollment {
  qrDataUrl: string;
  manualSecret: string;
  issuer: string;
  account: string;
}

export function AdminMfaGate({
  status,
  onVerified,
}: {
  status: AdminMfaStatus;
  onVerified: () => Promise<void> | void;
}) {
  const [
    enrollment,
    setEnrollment,
  ] =
    useState<Enrollment | null>(
      null,
    );

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    token,
    setToken,
  ] = useState("");

  const [
    recoveryCodes,
    setRecoveryCodes,
  ] =
    useState<string[] | null>(
      null,
    );

  const [
    working,
    setWorking,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  async function startEnrollment() {
    setWorking(true);
    setError(null);

    try {
      const response =
        await apiRequest(
          "POST",
          "/api/security/admin-mfa/enroll/start",
          {
            currentPassword,
          },
        );

      setEnrollment(
        await response.json(),
      );

      setCurrentPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start MFA enrollment",
      );
    } finally {
      setWorking(false);
    }
  }

  async function confirmEnrollment() {
    setWorking(true);
    setError(null);

    try {
      const response =
        await apiRequest(
          "POST",
          "/api/security/admin-mfa/enroll/confirm",
          { token },
        );

      const data =
        await response.json() as {
          recoveryCodes: string[];
        };

      setRecoveryCodes(
        data.recoveryCodes,
      );

      setToken("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to confirm MFA",
      );
    } finally {
      setWorking(false);
    }
  }

  async function verify() {
    setWorking(true);
    setError(null);

    try {
      await apiRequest(
        "POST",
        "/api/security/admin-mfa/verify",
        { token },
      );

      setToken("");

      await onVerified();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify MFA",
      );
    } finally {
      setWorking(false);
    }
  }

  if (!status.configured) {
    return (
      <Alert variant="destructive">
        <KeyRound className="h-4 w-4" />

        <AlertTitle>
          MFA encryption unavailable
        </AlertTitle>

        <AlertDescription>
          Control Room remains locked.
        </AlertDescription>
      </Alert>
    );
  }

  if (recoveryCodes) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>
            Save these recovery codes
          </CardTitle>

          <CardDescription>
            They are displayed only once.
            Keep them somewhere separate
            from this computer.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-2 rounded-md border p-4 font-mono text-sm sm:grid-cols-2">
            {recoveryCodes.map(
              (code) => (
                <div key={code}>
                  {code}
                </div>
              ),
            )}
          </div>

          <Button
            onClick={() => {
              void onVerified();
            }}
          >
            Recovery codes stored
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status.enabled) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-red-700" />

            <CardTitle>
              Secure the Control Room
            </CardTitle>
          </div>

          <CardDescription>
            Administrator access requires
            password confirmation followed
            by authenticator enrollment.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {!enrollment ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="mfa-current-password">
                  Current administrator password
                </Label>

                <Input
                  id="mfa-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target.value,
                    )
                  }
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                disabled={
                  working ||
                  !currentPassword
                }
                onClick={() => {
                  void startEnrollment();
                }}
              >
                Create authenticator setup
              </Button>
            </>
          ) : (
            <>
              <div className="flex justify-center rounded-md border bg-white p-4">
                <img
                  src={enrollment.qrDataUrl}
                  alt="Authenticator enrollment QR code"
                  className="h-72 w-72"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Manual setup key
                </Label>

                <div className="break-all rounded-md border bg-muted p-3 font-mono text-sm">
                  {enrollment.manualSecret}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfa-enrollment-token">
                  Current 6-digit authenticator code
                </Label>

                <Input
                  id="mfa-enrollment-token"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={token}
                  onChange={(event) =>
                    setToken(
                      event.target.value,
                    )
                  }
                  placeholder="123456"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                disabled={
                  working ||
                  token.trim().length < 6
                }
                onClick={() => {
                  void confirmEnrollment();
                }}
              >
                Verify and enable MFA
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>
          Administrator verification
        </CardTitle>

        <CardDescription>
          Enter your authenticator code.
          An unused recovery code is also
          accepted.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {status.lockedUntil && (
          <Alert variant="destructive">
            <AlertDescription>
              MFA temporarily locked until{" "}
              {new Date(
                status.lockedUntil,
              ).toLocaleString()}.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="admin-mfa-token">
            Authenticator or recovery code
          </Label>

          <Input
            id="admin-mfa-token"
            autoComplete="one-time-code"
            value={token}
            onChange={(event) =>
              setToken(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                token.trim()
              ) {
                void verify();
              }
            }}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Button
          disabled={
            working ||
            !token.trim()
          }
          onClick={() => {
            void verify();
          }}
        >
          Enter Control Room
        </Button>
      </CardContent>
    </Card>
  );
}
