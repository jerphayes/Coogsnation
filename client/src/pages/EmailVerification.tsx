import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type VerifyState =
  | "verifying"
  | "activated"
  | "expired"
  | "invalid"
  | "error";

export default function EmailVerification() {
  const [state, setState] =
    useState<VerifyState>("verifying");

  const [message, setMessage] =
    useState("Confirming your CoogsNation membership…");

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const token =
      params.get("token")?.trim() || "";

    if (!token) {
      setState("invalid");
      setMessage(
        "This membership confirmation link is invalid."
      );
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
      }),
    })
      .then(async (response) => {
        const data =
          await response
            .json()
            .catch(() => ({}));

        if (
          response.ok &&
          data?.status === "activated"
        ) {
          setState("activated");
          setMessage(
            "Your CoogsNation membership is now active."
          );
          return;
        }

        if (
          response.status === 410 ||
          data?.status === "expired"
        ) {
          setState("expired");
          setMessage(
            data?.message ||
            "This confirmation link expired after 24 hours."
          );
          return;
        }

        if (
          data?.status === "invalid"
        ) {
          setState("invalid");
          setMessage(
            data?.message ||
            "This confirmation link is invalid or has already been used."
          );
          return;
        }

        setState("error");
        setMessage(
          data?.message ||
          "Unable to confirm membership."
        );
      })
      .catch(() => {
        setState("error");
        setMessage(
          "Unable to reach the membership confirmation service."
        );
      });
  }, []);

  const icon =
    state === "activated" ? (
      <CheckCircle2 className="h-10 w-10 text-white" />
    ) : state === "expired" ? (
      <Clock className="h-10 w-10 text-white" />
    ) : state === "verifying" ? (
      <Clock className="h-10 w-10 text-white animate-pulse" />
    ) : (
      <XCircle className="h-10 w-10 text-white" />
    );

  const heading =
    state === "activated"
      ? "Membership Confirmed!"
      : state === "expired"
        ? "Confirmation Expired"
        : state === "verifying"
          ? "Confirming Membership"
          : "Confirmation Problem";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-black">
      <Card className="relative w-full max-w-xl">
        {/* UNIVERSAL_PAGE_CARD_CLOSE_V1 */}
        <button
          type="button"
          aria-label="Close"
          title="Close"
          onClick={() => { window.location.href = "/"; }}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-2xl font-bold leading-none text-gray-800 shadow-sm hover:bg-gray-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
        >
          ×
        </button>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-600">
            {icon}
          </div>

          <CardTitle className="text-3xl">
            {heading}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <p className="text-lg text-gray-700">
            {message}
          </p>

          {state === "activated" && (
            <>
              <div className="rounded-lg border border-green-200 bg-green-50 p-5">
                <p className="font-bold text-green-800">
                  Welcome to CoogsNation!
                </p>

                <p className="mt-2 text-gray-700">
                  Your email has been verified and
                  your membership is active.
                </p>
              </div>

              <a
                href="/login/email"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#C8102E] px-6 py-3 font-bold !text-white hover:!text-white hover:bg-[#A50D26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
                style={{ color: "#ffffff" }}
              >
                Login to CoogsNation
              </a>
            </>
          )}

          {state === "expired" && (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                <p className="font-semibold text-amber-900">
                  The 24-hour confirmation period has ended.
                </p>

                <p className="mt-2 text-gray-700">
                  Your pending membership was not activated.
                  Please register again.
                </p>
              </div>

              <a
                href="/join"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#C8102E] px-6 py-3 font-bold !text-white hover:!text-white hover:bg-[#A50D26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
                style={{ color: "#ffffff" }}
              >
                Join CoogsNation Again
              </a>
            </>
          )}

          {(state === "invalid" ||
            state === "error") && (
            <>
              <div className="rounded-lg border border-red-200 bg-red-50 p-5">
                <p className="text-red-800">
                  {state === "invalid"
                    ? "The link may already have been used or is not valid."
                    : "Please try again later."}
                </p>
              </div>

              <a
                href="/"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border-2 border-gray-400 bg-white px-5 py-2 font-bold text-gray-950 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                Return to CoogsNation
              </a>
            </>
          )}

          {state === "verifying" && (
            <p className="text-sm text-gray-500">
              Please wait…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
