import {
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

import PageCardClose from "@/components/PageCardClose";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";


type VerifyState =
  | "verifying"
  | "verified"
  | "expired"
  | "invalid"
  | "error";


function safeReturnTo():string {
  const value =
    new URLSearchParams(
      window.location.search,
    ).get("returnTo") ||
    "/dashboard";

  if (
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

  return value;
}


export default function EmailVerification() {
  const [state,setState] =
    useState<VerifyState>(
      "verifying",
    );

  const [message,setMessage] =
    useState(
      "Verifying your email…",
    );


  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const token =
      params
        .get("token")
        ?.trim() ||
      "";

    const returnTo =
      safeReturnTo();

    if (!token) {
      setState("invalid");
      setMessage(
        "This verification link is invalid.",
      );
      return;
    }

    let redirectTimer:
      number |
      undefined;

    fetch(
      "/api/auth/verify-email",
      {
        method:
          "POST",

        credentials:
          "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            token,
          }),
      },
    )
      .then(
        async (
          response,
        ) => {
          const data =
            await response
              .json()
              .catch(
                () => ({}),
              );

          if (
            response.ok &&
            data?.status ===
              "verified"
          ) {
            setState(
              "verified",
            );

            setMessage(
              "Email verified. Opening your CoogsNation profile setup…",
            );

            const next =
              new URLSearchParams({
                setupToken:
                  token,

                returnTo,
              });

            redirectTimer =
              window.setTimeout(
                () => {
                  window.location.replace(
                    `/complete-profile?${next.toString()}`,
                  );
                },
                500,
              );

            return;
          }

          if (
            response.status ===
              410 ||
            data?.status ===
              "expired"
          ) {
            setState(
              "expired",
            );

            setMessage(
              data?.message ||
              "This verification link has expired. Request a new link to continue.",
            );

            return;
          }

          if (
            data?.status ===
            "invalid"
          ) {
            setState(
              "invalid",
            );

            setMessage(
              data?.message ||
              "This verification link is invalid.",
            );

            return;
          }

          setState("error");

          setMessage(
            data?.message ||
            "Unable to verify email.",
          );
        },
      )
      .catch(
        () => {
          setState("error");

          setMessage(
            "Unable to reach the email verification service.",
          );
        },
      );

    return () => {
      if (
        redirectTimer !==
        undefined
      ) {
        window.clearTimeout(
          redirectTimer,
        );
      }
    };
  }, []);


  const icon =
    state === "verified"
      ? (
          <CheckCircle2 className="h-10 w-10 text-white" />
        )
      : state === "verifying"
        ? (
            <Clock className="h-10 w-10 animate-pulse text-white" />
          )
        : (
            <XCircle className="h-10 w-10 text-white" />
          );


  const heading =
    state === "verified"
      ? "Email Verified"
      : state === "expired"
        ? "Verification Link Expired"
        : state === "verifying"
          ? "Verifying Email"
          : "Verification Problem";


  const returnTo =
    safeReturnTo();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-black">
      <Card className="relative w-full max-w-xl">
        <PageCardClose />

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

          {state === "verified" && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-5">
              <p className="font-bold text-green-800">
                Email ownership confirmed.
              </p>

              <p className="mt-2 text-gray-700">
                Your membership is not active yet.
                Complete your profile to continue.
              </p>
            </div>
          )}

          {state === "expired" && (
            <a
              href={
                `/join/email?returnTo=` +
                encodeURIComponent(
                  returnTo,
                )
              }
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#C8102E] px-6 py-3 font-bold text-white"
            >
              REQUEST A NEW VERIFICATION
            </a>
          )}

          {
            (
              state ===
                "invalid" ||
              state ===
                "error"
            ) && (
              <a
                href="/"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border-2 border-gray-400 bg-white px-5 py-2 font-bold text-gray-950 hover:bg-gray-100"
              >
                Return to CoogsNation
              </a>
            )
          }

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
