import { MailCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EmailVerificationPending() {
  const params =
    new URLSearchParams(window.location.search);

  const email =
    params.get("email") || "your email address";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-black">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600">
            <MailCheck className="h-8 w-8 text-white" />
          </div>

          <CardTitle className="text-2xl">
            Check Your Email
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5 text-center">
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-800">
              Your CoogsNation membership is not active yet.
            </p>

            <p className="mt-3 text-gray-700">
              We will send a membership confirmation
              email to:
            </p>

            <p className="mt-2 font-bold">
              {email}
            </p>

            <p className="mt-4 text-gray-700">
              You must click the confirmation link
              in that email within
              <strong> 24 hours</strong>.
            </p>

            <p className="mt-4 font-semibold text-gray-900">
              No confirmation within 24 hours =
              no active CoogsNation membership.
            </p>
          </div>

          <p className="text-sm text-gray-600">
            After confirming your email, you can log in
            and complete any optional profile items,
            including your avatar.
          </p>

          <a
            href="/"
            className="inline-block font-semibold text-red-600"
          >
            Return to CoogsNation
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
