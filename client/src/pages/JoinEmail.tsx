import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const commonDomains = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "mail.com",
  "live.com",
  "msn.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
];

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

function suggestCommonEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return null;

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  if (commonDomains.includes(domain)) return null;

  let best = "";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of commonDomains) {
    const distance = editDistance(domain, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  if (best && bestDistance <= 2) return `${local}@${best}`;

  const stem = domain.split(".")[0];
  for (const candidate of commonDomains) {
    const candidateStem = candidate.split(".")[0];
    if (stem !== candidateStem && stem.startsWith(candidateStem)) {
      return `${local}@${candidate}`;
    }
  }

  return null;
}

const fieldClass =
  "h-12 border-2 border-gray-400 bg-white text-gray-950 placeholder:text-gray-500 " +
  "focus-visible:border-red-600 focus-visible:ring-2 focus-visible:ring-red-600 " +
  "dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-400";

export default function JoinEmail() {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedConfirmEmail = confirmEmail.trim().toLowerCase();

    if (!normalizedEmail || !normalizedConfirmEmail) {
      setMessage("Type your email address twice.");
      return;
    }

    if (normalizedEmail !== normalizedConfirmEmail) {
      setMessage("The email addresses do not match. Please retype them.");
      return;
    }

    const suggestion = suggestCommonEmail(normalizedEmail);
    if (suggestion) {
      setMessage(
        `That email domain looks incorrect. Did you mean ${suggestion}? Please retype your email.`,
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The passwords do not match. Please retype them.");
      return;
    }

    if (!consent) {
      setMessage("You must accept the membership data-use consent to continue.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/register-email", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          confirmEmail: normalizedConfirmEmail,
          handle: handle.trim(),
          password,
          consent,
          confirmPassword,
          hasConsentedToDataUse: consent,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          data?.message ||
            "Unable to create your membership. Please check the form and try again.",
        );
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      const next = new URLSearchParams({ email: normalizedEmail });
      if (returnTo) next.set("returnTo", returnTo);

      window.location.href = `/verify-email-pending?${next.toString()}`;
    } catch {
      setMessage("The membership service is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10 text-gray-950 dark:bg-gray-950 dark:text-gray-100">
      <Card className="mx-auto w-full max-w-xl border-2 border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-700">
            <Mail className="h-8 w-8 text-white" />
          </div>

          <CardTitle className="text-3xl font-bold text-gray-950 dark:text-white">
            Join CoogsNation by Email
          </CardTitle>

          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Type your email twice so the confirmation cannot be sent to a mistyped address.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="join-email" className="font-semibold text-gray-900 dark:text-gray-100">
                Email
              </label>
              <Input
                id="join-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={fieldClass}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="join-confirm-email" className="font-semibold text-gray-900 dark:text-gray-100">
                Confirm Email
              </label>
              <Input
                id="join-confirm-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
                placeholder="Type your email again"
                className={fieldClass}
                required
              />
              {email &&
                confirmEmail &&
                email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase() && (
                  <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm font-semibold text-red-800">
                    Email addresses do not match.
                  </p>
                )}
            </div>

            <div className="space-y-2">
              <label htmlFor="join-handle" className="font-semibold text-gray-900 dark:text-gray-100">
                CoogsNation Handle
              </label>
              <Input
                id="join-handle"
                type="text"
                autoComplete="username"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="BigCat"
                className={fieldClass}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="join-password" className="font-semibold text-gray-900 dark:text-gray-100">
                Password
              </label>
              <div className="relative">
                <Input
                  id="join-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a secure password"
                  className={`${fieldClass} pr-12`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="join-confirm-password" className="font-semibold text-gray-900 dark:text-gray-100">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="join-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Type your password again"
                  className={`${fieldClass} pr-12`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm font-semibold text-red-800">
                  Passwords do not match.
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border-2 border-gray-300 bg-gray-50 p-4 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-5 w-5 accent-red-700"
              />
              <span className="text-sm">
                I consent to CoogsNation using my information to create and operate my membership.
              </span>
            </label>

            {message && (
              <div
                role="alert"
                className="rounded-md border-2 border-red-300 bg-red-50 p-3 font-semibold text-red-900"
              >
                {message}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full bg-red-700 text-base font-bold text-white hover:bg-red-800 focus-visible:ring-red-600 disabled:bg-gray-400 disabled:text-gray-800"
            >
              {submitting ? "Creating Membership..." : "Create Membership"}
            </Button>

            <a
              href="/join"
              className="block rounded-md border-2 border-gray-400 bg-white px-4 py-3 text-center font-semibold text-gray-900 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              Back to Signup Options
            </a>

            <div className="flex items-start gap-2 rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
              Your membership stays pending until you click the confirmation link sent to the exact email shown on the next screen.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
