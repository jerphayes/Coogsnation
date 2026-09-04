import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = {
  configured: boolean;
  enabled: boolean;
  enrolledAt: string | null;
  recoveryCodesRemaining: number;
};

type Setup = {
  qrDataUrl: string;
  manualSecret: string;
  issuer: string;
  account: string;
};

async function requestJson(
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(
    path,
    {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type":
          "application/json",
        ...(init?.headers || {}),
      },
    },
  );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ||
        "Request failed",
    );
  }

  return data;
}

export default function MemberMfaPanel({
  autoStart = false,
  onEnabled,
}: {
  autoStart?: boolean;
  onEnabled?: () => void;
} = {}) {
  const [
    status,
    setStatus,
  ] =
    useState<Status | null>(
      null,
    );

  const [
    setup,
    setSetup,
  ] =
    useState<Setup | null>(
      null,
    );

  const [
    token,
    setToken,
  ] =
    useState("");

  const [
    recoveryCodes,
    setRecoveryCodes,
  ] =
    useState<string[]>([]);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    showDisableWarning,
    setShowDisableWarning,
  ] =
    useState(false);

  const [
    disableAcknowledged,
    setDisableAcknowledged,
  ] =
    useState(false);

  const onboardingStarted =
    useRef(false);

  async function refresh() {
    try {
      setStatus(
        await requestJson(
          "/api/security/member-mfa/status",
        ),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load 2FA status",
      );
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function startEnrollment() {
    if (
      busy ||
      status?.enabled
    ) {
      return;
    }

    setBusy(true);
    setMessage("");
    setShowDisableWarning(false);

    try {
      const data =
        await requestJson(
          "/api/security/member-mfa/enroll/start",
          {
            method: "POST",
            body: "{}",
          },
        );

      setSetup(data);
      setToken("");
      setRecoveryCodes([]);

      setMessage(
        "Scan the QR code with your authenticator app, then enter its 6-digit code.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to start 2FA",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (
      !status ||
      !status.configured ||
      status.enabled ||
      setup ||
      onboardingStarted.current
    ) {
      return;
    }

    const url =
      new URL(
        window.location.href,
      );

    const setupRequestedByUrl =
      url.searchParams.get(
        "setup2fa",
      ) === "1";

    if (
      !autoStart &&
      !setupRequestedByUrl
    ) {
      return;
    }

    onboardingStarted.current =
      true;

    if (setupRequestedByUrl) {
      url.searchParams.delete(
        "setup2fa",
      );

      window.history.replaceState(
        {},
        "",
        url.pathname +
          url.search +
          url.hash,
      );
    }

    void startEnrollment();
  }, [status, setup]);

  async function confirmEnrollment() {
    setBusy(true);
    setMessage("");

    try {
      const data =
        await requestJson(
          "/api/security/member-mfa/enroll/confirm",
          {
            method: "POST",
            body:
              JSON.stringify({
                token,
              }),
          },
        );

      setRecoveryCodes(
        data.recoveryCodes || [],
      );

      setSetup(null);
      setToken("");

      setMessage(
        "2FA is enabled. Save your recovery codes now.",
      );

      await refresh();

      onEnabled?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to enable 2FA",
      );
    } finally {
      setBusy(false);
    }
  }

  function requestDisable() {
    setDisableAcknowledged(
      false,
    );

    setShowDisableWarning(
      true,
    );
  }

  async function disableMfa() {
    if (!disableAcknowledged) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await requestJson(
        "/api/security/member-mfa/disable",
        {
          method: "POST",
          body: "{}",
        },
      );

      setToken("");
      setRecoveryCodes([]);
      setSetup(null);

      setShowDisableWarning(
        false,
      );

      setDisableAcknowledged(
        false,
      );

      setMessage(
        "Two-factor authentication has been disabled.",
      );

      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to disable 2FA",
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleMfa() {
    if (!status) {
      return;
    }

    if (status.enabled) {
      requestDisable();
      return;
    }

    if (!setup) {
      void startEnrollment();
    }
  }

  if (!status) {
    return (
      <p className="text-sm text-gray-600">
        Checking two-factor
        authentication…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold">
          Protect Your Account
        </h3>

        <p className="mt-1 text-sm font-semibold text-gray-700">
          We strongly suggest that you register for two-factor authentication (2FA). 2FA adds an extra layer of protection of your data we take account security seriously, an will employ the latest protections an updates as technology advances. to do so.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
        <div className="min-w-0 flex-1">
          <p className="font-bold">
            Two-Factor Authentication
          </p>

          <p className="text-sm text-gray-600">
            {status.enabled
              ? "Authenticator app enabled"
              : "Not enabled"}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={
            status.enabled
          }
          aria-label="Two-factor authentication"
          disabled={
            busy ||
            !status.configured
          }
          onClick={toggleMfa}
          className={[
            "relative inline-flex h-8 w-14 shrink-0 rounded-full transition",
            "focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2",
            status.enabled
              ? "bg-green-600"
              : "bg-gray-300",
            busy
              ? "cursor-wait opacity-60"
              : "",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
              status.enabled
                ? "left-7"
                : "left-1",
            ].join(" ")}
          />
        </button>

        <span
          className={
            status.enabled
              ? "font-bold text-green-700"
              : "font-bold text-gray-600"
          }
        >
          {status.enabled
            ? "ON"
            : "OFF"}
        </span>
      </div>

      {!status.configured && (
        <p className="text-sm font-semibold text-red-700">
          Authenticator security
          is temporarily
          unavailable.
        </p>
      )}

      {message && (
        <p
          className="text-sm font-semibold text-gray-700"
          role="status"
        >
          {message}
        </p>
      )}

      {setup &&
        !status.enabled && (
          <div className="max-w-lg space-y-4 rounded-lg border p-4">
            <h4 className="font-bold">
              Enable 2FA with an Authenticator App
            </h4>

            <img
              src={setup.qrDataUrl}
              alt="Authenticator setup QR code"
              className="h-52 w-52 rounded border bg-white p-2"
            />

            <div>
              <p className="text-sm font-semibold">
                Manual setup code
              </p>

              <code className="mt-1 block break-all rounded border bg-gray-50 p-3">
                {setup.manualSecret}
              </code>
            </div>

            <Input
              value={token}
              onChange={event =>
                setToken(
                  event.target.value,
                )
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit authenticator code"
              maxLength={6}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={
                  busy ||
                  token.trim()
                    .length !== 6
                }
                onClick={() =>
                  void confirmEnrollment()
                }
                className="bg-red-700 text-white hover:bg-red-800"
              >
                COMPLETE 2FA SETUP
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setSetup(null);
                  setToken("");
                  setMessage("");
                }}
              >
                CANCEL
              </Button>
            </div>
          </div>
        )}

      {recoveryCodes.length >
        0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-bold">
            Save these recovery
            codes
          </p>

          <p className="mt-1 text-sm">
            Each recovery code can
            be used only once.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {recoveryCodes.map(
              code => (
                <code
                  key={code}
                  className="rounded border bg-white px-3 py-2 text-center font-bold"
                >
                  {code}
                </code>
              ),
            )}
          </div>
        </div>
      )}

      {status.enabled &&
        showDisableWarning && (
          <div className="max-w-xl rounded-lg border border-red-300 bg-red-50 p-4">
            <h4 className="font-bold text-red-800">
              Turn Off Two-Factor
              Authentication?
            </h4>

            <p className="mt-2 text-sm font-semibold text-gray-800">
              Turning off 2FA raises
              the risk to your account
              security. Your account
              will no longer require an
              authenticator code when
              signing in.
            </p>

            <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-gray-900">
              <input
                type="checkbox"
                checked={
                  disableAcknowledged
                }
                onChange={event =>
                  setDisableAcknowledged(
                    event.target
                      .checked,
                  )
                }
                className="mt-1 h-4 w-4"
              />

              <span>
                I understand that turning off two-factor authentication (2FA) increases the risk to my account security, and I choose to turn it off.
              </span>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setShowDisableWarning(
                    false,
                  );

                  setDisableAcknowledged(
                    false,
                  );
                }}
              >
                KEEP 2FA ON
              </Button>

              <Button
                type="button"
                variant="destructive"
                disabled={
                  busy ||
                  !disableAcknowledged
                }
                onClick={() =>
                  void disableMfa()
                }
              >
                TURN 2FA OFF
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}
