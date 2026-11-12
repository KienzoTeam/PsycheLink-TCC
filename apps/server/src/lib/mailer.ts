import nodemailer from 'nodemailer';

// Lidos ao carregar o módulo, como o transporte SMTP abaixo.
const chaveBrevo = process.env.BREVO_API_KEY;
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

// Para log: a mensagem e o envelope do nodemailer podem trazer o endereço do destinatário.
export const resumoErroSmtp = (erro: unknown) => {
  const { code, responseCode } = (erro ?? {}) as { code?: string; responseCode?: number };
  return { code, responseCode };
};

// Brevo (HTTP) vale mais que SMTP: o Render gratuito bloqueia as portas SMTP.
export const transporteDeEmail = () => {
  if (chaveBrevo) return 'Brevo';
  if (smtpAtivo) return 'SMTP';
  return process.env.NODE_ENV === 'production' ? 'nenhum' : 'console de dev';
};

async function enviar(para: string, assunto: string, texto: string, html: string): Promise<void> {
  if (chaveBrevo) {
    // EMAIL_FROM é "Nome <email>"; sem o nome, vale o endereço sozinho.
    const from = process.env.EMAIL_FROM ?? '';
    const partes = /^(.*?)\s*<(.+)>$/.exec(from);
    const resposta = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': chaveBrevo, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: partes ? { name: partes[1], email: partes[2] } : { email: from },
        to: [{ email: para }],
        subject: assunto,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    // Só o status vai no erro: o corpo e o destinatário não podem chegar ao log.
    if (!resposta.ok) {
      throw Object.assign(new Error(`Brevo respondeu ${resposta.status}`), {
        code: 'EBREVO',
        responseCode: resposta.status,
      });
    }
  } else if (smtpAtivo) {
    await mailer.sendMail({ from: process.env.EMAIL_FROM, to: para, subject: assunto, text: texto, html });
  }
}

export async function enviarCodigo(
  email: string,
  codigo: number,
  assunto = 'PsycheLink · Confirme seu e-mail'
): Promise<void> {
  // Só no dev sem e-mail configurado o código vai para o console; com e-mail de verdade ele nunca chega ao log.
  if (transporteDeEmail() === 'console de dev') {
    console.log(`[código] ${email} · ${assunto}: ${codigo}`);
  }

  await enviar(
    email,
    assunto,
    `Seu código é ${codigo}. Ele expira em 15 minutos.`,
    `<p>Seu código é <strong>${codigo}</strong>.</p><p>Expira em 15 minutos.</p>`
  );
}

// Cadastro tentado com um e-mail que já existe: o dono é avisado aqui, sem código nenhum,
// porque a resposta da API é igual à de um cadastro novo e não pode revelar a conta.
export async function enviarAvisoCadastro(email: string): Promise<void> {
  const assunto = 'PsycheLink · Tentativa de cadastro com seu e-mail';
  const texto =
    'Alguém tentou criar uma conta no PsycheLink com este e-mail. ' +
    "Se foi você, entre normalmente ou use 'Esqueci minha senha'; se ainda não confirmou o cadastro, use o código que enviamos antes. " +
    'Se não foi você, ignore esta mensagem.';

  if (transporteDeEmail() === 'console de dev') {
    console.log(`[aviso] ${email} · ${assunto}`);
  }

  await enviar(email, assunto, texto, `<p>${texto}</p>`);
}
