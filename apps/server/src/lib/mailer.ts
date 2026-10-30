import nodemailer from 'nodemailer';

const smtpAtivo = Boolean(process.env.SMTP_HOST);

export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT ?? 587) === 465,
  auth:
    smtpAtivo && process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  // Falha rápido para a rota responder erro em vez de travar o cliente.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

export async function enviarCodigo(
  email: string,
  codigo: number,
  assunto = 'PsycheLink · Confirme seu e-mail'
): Promise<void> {
  // Só no dev sem SMTP o código vai para o console; com e-mail de verdade ele nunca chega ao log.
  if (!smtpAtivo && process.env.NODE_ENV !== 'production') {
    console.log(`[código] ${email} · ${assunto}: ${codigo}`);
  }

  if (!smtpAtivo) return;
  await mailer.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: assunto,
    text: `Seu código é ${codigo}. Ele expira em 15 minutos.`,
    html: `<p>Seu código é <strong>${codigo}</strong>.</p><p>Expira em 15 minutos.</p>`,
  });
}
