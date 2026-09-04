import {
  Mail,
} from "lucide-react";

import PageCardClose from "@/components/PageCardClose";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";


export default function EmailVerificationPending() {
  const params =
    new URLSearchParams(
      window.location.search,
    );

  const email =
    params.get("email") ||
    "your email address";

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10 text-gray-950 dark:bg-gray-950 dark:text-gray-100">
      <Card className="relative mx-auto w-full max-w-xl border-2 border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <PageCardClose />

        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-700">
            <Mail className="h-8 w-8 text-white" />
          </div>

          <CardTitle className="text-3xl font-black">
            CHECK YOUR EMAIL IMMEDIATELY
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <p className="text-lg">
            We sent a verification link to
          </p>

          <p className="break-all text-xl font-black text-red-700">
            {email}
          </p>

          <div className="rounded-lg border-2 border-red-300 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/30">
            <p className="text-lg font-black text-red-800 dark:text-red-200">
              VERIFY YOUR EMAIL NOW TO CONTINUE
            </p>
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <strong>If you do not see the verification email in your inbox, check your Spam/Junk and Promotions folders.</strong>
            </div>

          </div>

          <p className="text-gray-700 dark:text-gray-300">
            Open the message from CoogsNation and click
            the verification link.
          </p>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            After verification, you will complete your
            CoogsNation profile, password and membership setup.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
