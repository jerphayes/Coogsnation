import {
  useState,
  type FormEvent,
} from "react";

import {
  Mail,
} from "lucide-react";

import PageCardClose from "@/components/PageCardClose";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";


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


export default function JoinEmail() {
  const [email,setEmail] =
    useState("");

  const [submitting,setSubmitting] =
    useState(false);

  const [message,setMessage] =
    useState("");

  const [accountExists,setAccountExists] =
    useState(false);


  async function submit(
    event:FormEvent,
  ) {
    event.preventDefault();

    setMessage("");
    setAccountExists(false);

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      setMessage(
        "Enter your email address.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const returnTo =
        safeReturnTo();

      const response =
        await fetch(
          "/api/auth/register-email",
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
                email:
                  normalizedEmail,

                returnTo,
              }),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => ({}),
          );

      if (!response.ok) {
        if (
          data?.code ===
          "ACCOUNT_EXISTS"
        ) {
          setAccountExists(true);
        }

        setMessage(
          data?.message ||
          "Unable to start your membership. Please try again.",
        );

        return;
      }

      const next =
        new URLSearchParams({
          email:
            normalizedEmail,
        });

      if (
        returnTo !==
        "/dashboard"
      ) {
        next.set(
          "returnTo",
          returnTo,
        );
      }

      window.location.href =
        `/verify-email-pending?${next.toString()}`;
    } catch {
      setMessage(
        "The membership service is unavailable. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }


  const returnTo =
    safeReturnTo();

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10 text-gray-950 dark:bg-gray-950 dark:text-gray-100">
      <Card className="relative mx-auto w-full max-w-xl border-2 border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <PageCardClose />

        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-700">
            <Mail className="h-8 w-8 text-white" />
          </div>

          <CardTitle className="text-3xl font-bold text-gray-950 dark:text-white">
            Join CoogsNation
          </CardTitle>

          <p className="mt-2 text-base text-gray-700 dark:text-gray-300">
            Enter your email to begin.
          </p>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={submit}
            className="space-y-5"
            noValidate
          >
            <div className="space-y-2">
              <label
                htmlFor="join-email"
                className="font-semibold text-gray-900 dark:text-gray-100"
              >
                Email
              </label>

              <Input
                id="join-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={
                  (
                    event,
                  ) =>
                    setEmail(
                      event.target.value,
                    )
                }
                placeholder="you@example.com"
                className="h-12 border-2 border-gray-400 bg-white text-gray-950 placeholder:text-gray-500 focus-visible:border-red-600 focus-visible:ring-2 focus-visible:ring-red-600 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                autoFocus
                required
              />
            </div>

            {message && (
              <div
                role="alert"
                className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
              >
                {message}
              </div>
            )}

            {accountExists && (
              <a
                href={
                  `/login/email?returnTo=` +
                  encodeURIComponent(
                    returnTo,
                  )
                }
                className="flex min-h-11 w-full items-center justify-center rounded-md border-2 border-gray-400 bg-white px-5 py-3 font-bold text-gray-950 hover:bg-gray-100"
              >
                SIGN IN
              </a>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="min-h-12 w-full bg-[#C8102E] text-base font-black text-white hover:bg-[#A50D26]"
            >
              {
                submitting
                  ? "SENDING…"
                  : "CONTINUE"
              }
            </Button>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              We will send a verification link to this email.
            </p>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Already a member?{" "}
              <a
                href={
                  `/login/email?returnTo=` +
                  encodeURIComponent(
                    returnTo,
                  )
                }
                className="font-bold text-red-700 underline"
              >
                Sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
