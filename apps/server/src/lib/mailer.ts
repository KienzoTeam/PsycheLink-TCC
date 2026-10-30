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

// Cadastro tentado com um e-mail que já existe: o dono é avisado aqui, sem código nenhum,
// porque a resposta da API é igual à de um cadastro novo e não pode revelar a conta.
export async function enviarAvisoCadastro(email: string): Promise<void> {
  const assunto = 'PsycheLink · Tentativa de cadastro com seu e-mail';
  const texto =
    'Alguém tentou criar uma conta no PsycheLink com este e-mail. ' +
    "Se foi você, entre normalmente ou use 'Esqueci minha senha'; se ainda não confirmou o cadastro, use o código que enviamos antes. " +
    'Se não foi você, ignore esta mensagem.';

  if (!smtpAtivo && process.env.NODE_ENV !== 'production') {
    console.log(`[aviso] ${email} · ${assunto}`);
  }

  if (!smtpAtivo) return;
  await mailer.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: assunto,
    text: texto,
    html: `<p>${texto}</p>`,
  });
}
