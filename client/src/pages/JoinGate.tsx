import PageCardClose from "@/components/PageCardClose";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Mail,
  ShieldCheck,
  UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthProviders = {
  local: boolean;
  google?: boolean;
  apple?: boolean;
};

function safeReturnTo(): string {
  const value =
    new URLSearchParams(
      window.location.search,
    ).get("returnTo") || "/dashboard";

  if (
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

  return value;
}

export default function JoinGate() {
  const returnTo = safeReturnTo();

  const { data: providers } =
    useQuery<AuthProviders>({
      queryKey: ["/api/auth/providers"],
    });

  function startOAuth(
    provider: "google" | "apple",
  ) {
    window.location.href =
      `/api/auth/${provider}` +
      `?returnTo=${encodeURIComponent(returnTo)}`;
  }

  function startEmail() {
    window.location.href =
      `/join/email` +
      `?returnTo=${encodeURIComponent(returnTo)}`;
  }

  function continueAsGuest() {
    localStorage.setItem(
      "guestMode",
      "true",
    );

    window.location.href =
      returnTo === "/dashboard"
        ? "/forums"
        : returnTo;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-black">
      <Card className="relative w-full max-w-lg shadow-xl">
        <PageCardClose />
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>

          <CardTitle className="text-3xl relative">

            Join the CoogsNation Community
          </CardTitle>

          <CardDescription className="pt-2 text-base">
            Create your free member profile to
            post, reply and participate.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {providers?.google && (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start text-base"
              onClick={() =>
                startOAuth("google")
              }
            >
              <span className="mr-3 flex h-7 w-7 items-center justify-center rounded-full border font-bold">
                G
              </span>

              <span className="flex-1 text-left">
                Continue with Google
              </span>

              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {providers?.apple && (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start text-base"
              onClick={() =>
                startOAuth("apple")
              }
            >
              <span className="mr-3 flex h-7 w-7 items-center justify-center rounded-full border font-bold">
                
              </span>

              <span className="flex-1 text-left">
                Continue with Apple
              </span>

              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-start text-base"
            onClick={startEmail}
          >
            <Mail className="mr-3 h-5 w-5" />

            <span className="flex-1 text-left">
              Continue with Email
            </span>

            <ArrowRight className="h-4 w-4" />
          </Button>

          {returnTo === "/dashboard" && (
            <div className="pt-3">
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full text-gray-600"
                onClick={continueAsGuest}
              >
                <UserRound className="mr-2 h-4 w-4" />
                Not now — continue as Guest
              </Button>
            </div>
          )}

          <p className="pt-3 text-center text-xs text-gray-500">
            Guests can browse public CoogsNation
            content. Membership is required to post,
            reply and participate.
          </p>

          <p className="text-center text-sm text-gray-600">
            Already a member?{" "}
            <a
              href={
                `/login?returnTo=` +
                encodeURIComponent(returnTo)
              }
              className="font-semibold text-red-600 hover:underline"
            >
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
