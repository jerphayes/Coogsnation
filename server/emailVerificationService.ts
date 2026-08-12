import {
  createHash,
  randomBytes,
} from "crypto";

import { sendEmail } from "./emailService";

export const EMAIL_VERIFICATION_WINDOW_MS =
  24 * 60 * 60 * 1000;

export function createEmailVerificationToken(): {
  token: string;
  tokenHash: string;
} {
  /*
   * 32 random bytes = 256 bits of entropy.
   * The raw token goes only into the email.
   * The database stores only its SHA-256 hash.
   */
  const token =
    randomBytes(32).toString("hex");

  const tokenHash =
    hashEmailVerificationToken(token);

  return {
    token,
    tokenHash,
  };
}

export function hashEmailVerificationToken(
  token: string,
): string {
  return createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

type VerificationEmailParams = {
  email: string;
  firstName?: string | null;
  token: string;
  baseUrl: string;
};

export async function sendMembershipVerificationEmail({
  email,
  firstName,
  token,
  baseUrl,
}: VerificationEmailParams): Promise<boolean> {

  const cleanBase =
    baseUrl.replace(/\/+$/, "");

  const verifyUrl =
    `${cleanBase}/verify-email?token=${encodeURIComponent(token)}`;

  const fromEmail =
    process.env.FROM_EMAIL ||
    "noreply@coogsnation.com";

  const memberName =
    firstName?.trim() || "Coogs fan";

  const subject =
    "Confirm your CoogsNation membership";

  const text = `
Hello ${memberName},

Thanks for joining CoogsNation.

Your membership is NOT active yet.

Confirm your email by opening this link:

${verifyUrl}

You must confirm your email within 24 hours.

If you do not confirm within 24 hours, the pending membership will expire and you will need to register again.

If you did not request this membership, you can ignore this email.

Go Coogs!
CoogsNation
  `.trim();

  const html = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >
  <title>Confirm your CoogsNation membership</title>
</head>

<body
  style="
    margin:0;
    padding:24px;
    background:#f4f4f5;
    color:#111827;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <div
    style="
      max-width:600px;
      margin:0 auto;
      background:#ffffff;
      border-radius:12px;
      overflow:hidden;
      box-shadow:0 4px 18px rgba(0,0,0,.08);
    "
  >
    <div
      style="
        background:#c8102e;
        color:#ffffff;
        padding:24px;
        text-align:center;
      "
    >
      <h1
        style="
          margin:0;
          font-size:26px;
        "
      >
        Confirm Your CoogsNation Membership
      </h1>
    </div>

    <div style="padding:30px;">
      <p>
        Hello ${escapeHtml(memberName)},
      </p>

      <p>
        Thanks for joining
        <strong>CoogsNation</strong>.
      </p>

      <div
        style="
          margin:22px 0;
          padding:16px;
          background:#fff1f2;
          border:1px solid #fecdd3;
          border-radius:8px;
        "
      >
        <strong>
          Your membership is not active yet.
        </strong>

        <p style="margin-bottom:0;">
          You must confirm your email within
          <strong>24 hours</strong>.
        </p>
      </div>

      <div
        style="
          text-align:center;
          margin:28px 0;
        "
      >
        <a
          href="${escapeHtml(verifyUrl)}"
          style="
            display:inline-block;
            background:#c8102e;
            color:#ffffff;
            text-decoration:none;
            font-weight:700;
            padding:14px 24px;
            border-radius:7px;
          "
        >
          Confirm My Membership
        </a>
      </div>

      <p style="font-size:14px;color:#4b5563;">
        If the button does not work, copy and paste
        this address into your browser:
      </p>

      <p
        style="
          word-break:break-all;
          font-size:13px;
          color:#4b5563;
        "
      >
        ${escapeHtml(verifyUrl)}
      </p>

      <p>
        If you do not confirm within 24 hours,
        the pending membership will expire and
        you will need to register again.
      </p>

      <p>
        If you did not request this membership,
        simply ignore this email.
      </p>

      <p style="margin-top:30px;">
        <strong>Go Coogs!</strong><br>
        CoogsNation
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: email,
    from: fromEmail,
    subject,
    text,
    html,
  });
}

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
