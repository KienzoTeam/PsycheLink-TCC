import nodemailer from 'nodemailer';
import { emailDeAviso, emailDeAvisoCadastro, emailDeCodigo, type TipoCodigo } from './emails';

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

// EMAIL_FROM é "Nome <email>", com aspas opcionais no nome; sem o nome, vale o endereço sozinho.
export const remetente = () => {
  const from = (process.env.EMAIL_FROM ?? '').trim();
  const partes = /^(.*?)\s*<(.+)>$/.exec(from);
  const name = partes?.[1].trim().replace(/^"(.*)"$/, '$1').trim();
  const email = (partes ? partes[2] : from).trim();
  return name ? { name, email } : { email };
};

async function enviar(para: string, assunto: string, texto: string, html: string): Promise<void> {
  if (chaveBrevo) {
    const resposta = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': chaveBrevo, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: remetente(),
        to: [{ email: para }],
        subject: assunto,
        htmlContent: html,
        textContent: texto,
      }),
      signal: AbortSignal.timeout(15_000),
    }).catch((erro: unknown) => {
      // Rede e timeout: a mensagem e a causa do erro original podem trazer a URL ou o destinatário; só o nome segue.
      throw Object.assign(new Error(`Brevo inacessível (${erro instanceof Error ? erro.name : 'Error'})`), {
        code: 'EBREVO',
      });
    });
    // O corpo nunca é lido nem logado; cancelar libera a conexão. Só o status vai no erro.
    await resposta.body?.cancel();
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

export async function enviarCodigo(email: string, codigo: number, tipo: TipoCodigo = 'cadastro'): Promise<void> {
  const { assunto, texto, html } = emailDeCodigo(tipo, codigo);
  // Só no dev sem e-mail configurado o código vai para o console; com e-mail de verdade ele nunca chega ao log.
  // O assunto já termina no código ("PsycheLink · Código de acesso: 123456").
  if (transporteDeEmail() === 'console de dev') console.log(`[código] ${email} · ${assunto}`);
  await enviar(email, assunto, texto, html);
}

// Cadastro tentado com um e-mail que já existe: o dono é avisado aqui, sem código nenhum,
// porque a resposta da API é igual à de um cadastro novo e não pode revelar a conta.
export async function enviarAvisoCadastro(email: string): Promise<void> {
  const { assunto, texto, html } = emailDeAvisoCadastro();
  if (transporteDeEmail() === 'console de dev') console.log(`[aviso] ${email} · ${assunto}`);
  await enviar(email, assunto, texto, html);
}

export async function enviarAviso(email: string, rotulo: string): Promise<void> {
  const { assunto, texto, html } = emailDeAviso(rotulo);
  if (transporteDeEmail() === 'console de dev') console.log(`[aviso] ${email} · ${assunto}`);
  await enviar(email, assunto, texto, html);
}
