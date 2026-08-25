export interface SmsOtpInput {
  to: string;
  code: string;
  expiresInSeconds: number;
  purpose: "admin_mfa" | "recovery";
}

export interface SmsProvider {
  sendOtp(
    input: SmsOtpInput,
  ): Promise<{ providerMessageId?: string }>;
}

export class DisabledSmsProvider implements SmsProvider {
  async sendOtp(
    _input: SmsOtpInput,
  ): Promise<{ providerMessageId?: string }> {
    throw new Error(
      "SMS MFA provider is not configured",
    );
  }
}
