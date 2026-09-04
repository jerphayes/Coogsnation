import {
  createHash,
  randomBytes,
} from "crypto";

import { sendEmail } from "./emailService";


/*
 * Internal security deadline.
 *
 * Do not advertise this duration to the user.
 * User-facing copy intentionally emphasizes immediate
 * verification instead of encouraging delay.
 */
export const EMAIL_VERIFICATION_WINDOW_MS =
  24 * 60 * 60 * 1000;


export function createEmailVerificationToken(): {
  token:string;
  tokenHash:string;
} {
  const token =
    randomBytes(32)
      .toString("hex");

  return {
    token,
    tokenHash:
      hashEmailVerificationToken(
        token,
      ),
  };
}


export function hashEmailVerificationToken(
  token:string,
):string {
  return createHash("sha256")
    .update(
      token,
      "utf8",
    )
    .digest("hex");
}


type VerificationEmailParams = {
  email:string;
  firstName?:string | null;
  token:string;
  baseUrl:string;
  returnTo?:string | null;
};


export async function sendMembershipVerificationEmail({
  email,
  firstName,
  token,
  baseUrl,
  returnTo,
}:VerificationEmailParams):Promise<boolean> {
  const cleanBase =
    baseUrl.replace(
      /\/+$/,
      "",
    );

  const safeReturnTo =
    returnTo &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//")
      ? returnTo
      : null;

  const verifyUrl =
    `${cleanBase}/verify-email?token=${encodeURIComponent(token)}` +
    (
      safeReturnTo
        ? `&returnTo=${encodeURIComponent(safeReturnTo)}`
        : ""
    );

  const fromEmail =
    process.env.FROM_EMAIL ||
    "noreply@coogsnation.com";

  const memberName =
    firstName?.trim() ||
    "Coogs fan";

  const subject =
    "VERIFY YOUR EMAIL NOW — CoogsNation";

  const text = `
Hello ${email},

Thank you for wanting to become a member of our community.

VERIFY YOUR EMAIL NOW TO CONTINUE — CoogsNation.com is your community.

VERIFY YOUR EMAIL NOW TO CONTINUE.

Your CoogsNation membership is not active yet.

Verify your email by opening this link:

${verifyUrl}

After verification, you will complete your CoogsNation profile and account setup.

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
  <title>Verify Your Email — CoogsNation</title>
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
        VERIFY YOUR EMAIL NOW
      </h1>
    </div>

    <div style="padding:30px;">
      <p>
        Hello <strong>${escapeHtml(email)}</strong>,
      </p>

      <p>
        Thank you for wanting to become a member of our community.
      </p>

      <p>
        <strong>
          VERIFY YOUR EMAIL NOW TO CONTINUE — CoogsNation.com is your community.
        </strong>
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
          VERIFY YOUR EMAIL NOW TO CONTINUE
        </strong>

        <p style="margin-bottom:0;">
          Your CoogsNation membership is
          not active yet.
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
          VERIFY EMAIL NOW
        </a>
      </div>

      <p>
        After verification, you will complete
        your CoogsNation profile and account setup.
      </p>

      <p
        style="
          font-size:14px;
          color:#4b5563;
        "
      >
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
  value:string,
):string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;",
    );
}
