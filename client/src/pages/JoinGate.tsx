import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReCaptcha } from "@/components/ReCaptcha";
import ProfileCompletion from "@/pages/ProfileCompletion";

type GateState =
  | "checking"
  | "locked"
  | "verifying"
  | "verified";

export default function JoinGate() {
  const [state, setState] =
    useState<GateState>("checking");

  const [token, setToken] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const siteKey =
    import.meta.env.VITE_JOIN_RECAPTCHA_SITE_KEY || "";

  useEffect(() => {
    fetch("/api/auth/join-gate/status", {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        setState(
          data?.verified
            ? "verified"
            : "locked"
        );
      })
      .catch(() => {
        setMessage(
          "Unable to check membership entrance."
        );
        setState("locked");
      });
  }, []);

  useEffect(() => {
    if (
      state !== "locked" ||
      !siteKey
    ) {
      return;
    }

    if (
      document.getElementById(
        "coogsnation-recaptcha-script"
      )
    ) {
      window.grecaptchaReadyCallback?.();
      return;
    }

    const script =
      document.createElement("script");

    script.id =
      "coogsnation-recaptcha-script";

    script.src =
      "https://www.google.com/recaptcha/api.js?render=explicit";

    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.grecaptchaReadyCallback?.();
    };

    document.head.appendChild(script);

  }, [state, siteKey]);

  async function verifyHuman() {
    if (!token) return;

    setState("verifying");
    setMessage("");

    try {
      const response = await fetch(
        "/api/auth/join-gate",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            "g-recaptcha-response":
              token,
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        setMessage(
          data?.message ||
          "Human verification failed."
        );

        setToken(null);
        setState("locked");

        window.grecaptcha?.reset?.();

        return;
      }

      setState("verified");

    } catch {
      setMessage(
        "Verification service unavailable."
      );

      setToken(null);
      setState("locked");
    }
  }

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black">
        Checking membership entrance…
      </div>
    );
  }

  if (state === "verified") {
    return <ProfileCompletion />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-black">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>

          <CardTitle className="text-2xl">
            Join CoogsNation
          </CardTitle>

          <p className="text-gray-600">
            Complete the human-verification challenge
            to open the membership form.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          {!siteKey ? (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
              CAPTCHA configuration unavailable.
            </div>
          ) : (
            <div className="flex justify-center">
              <ReCaptcha
                siteKey={siteKey}
                onChange={setToken}
                onExpired={() =>
                  setToken(null)
                }
                onError={() => {
                  setToken(null);
                  setMessage(
                    "CAPTCHA failed to load."
                  );
                }}
              />
            </div>
          )}

          {message && (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {message}
            </div>
          )}

          <Button
            type="button"
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            disabled={
              !token ||
              state === "verifying"
            }
            onClick={verifyHuman}
          >
            {state === "verifying"
              ? "Verifying…"
              : "Verify & Open Membership Form"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
