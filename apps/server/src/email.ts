import { config } from './config.js';

type OtpEmail = {
  to: string;
  code: string;
  purpose: 'email-verification' | 'password-reset';
};

export interface EmailSender {
  sendOtp(message: OtpEmail): Promise<void>;
}

class ResendEmailSender implements EmailSender {
  public constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  public async sendOtp({ to, code, purpose }: OtpEmail): Promise<void> {
    const isVerification = purpose === 'email-verification';
    const subject = isVerification
      ? 'Confirme seu e-mail no PsycheLink'
      : 'Código para redefinir sua senha no PsycheLink';
    const action = isVerification ? 'confirmar seu e-mail' : 'redefinir sua senha';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [to],
        subject,
        text: `Use o código ${code} para ${action}. Ele expira em 10 minutos. Se você não solicitou esta ação, ignore este e-mail.`,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`O provedor de e-mail recusou o envio (${response.status}): ${details}`);
    }
  }
}

class DevelopmentConsoleEmailSender implements EmailSender {
  public async sendOtp({ to, code, purpose }: OtpEmail): Promise<void> {
    // Nunca habilite este emissor em produção: o OTP não deve ir para logs reais.
    console.info(`[DEV ONLY] OTP de ${purpose} para ${to}: ${code}`);
  }
}

export function createEmailSender(): EmailSender {
  if (config.resendApiKey && config.emailFrom) {
    return new ResendEmailSender(config.resendApiKey, config.emailFrom);
  }

  if (config.isProduction) {
    throw new Error('RESEND_API_KEY e EMAIL_FROM são obrigatórios em produção.');
  }

  return new DevelopmentConsoleEmailSender();
}
