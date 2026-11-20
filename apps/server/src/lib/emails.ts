// Layout dos e-mails (Catppuccin Latte, como o painel), sem cartão: fundo único, que o tema escuro
// do leitor inverte sem sobrar moldura. E-mail não é página web: tabelas e estilos inline (Gmail e
// Outlook ignoram boa parte do CSS) e o logo como imagem hospedada (o Gmail bloqueia imagem embutida).
// Fontes da marca pelo Google Fonts: Apple Mail e alguns apps carregam; Gmail e Outlook caem no
// fallback (Georgia no nome, fonte do sistema no texto). Contraste ≥ 4,5:1 em todo texto.
// Os textos são fixos e o código só tem dígitos: nada vindo do usuário entra no HTML sem escapar.

const COR = {
  fundo: '#ffffff',
  texto: '#4c4f69', // 8:1 no fundo
  apoio: '#5c5f77', // 6,3:1 no fundo
  divisor: '#dce0e8',
  blocoCodigo: '#efe5fd',
  codigo: '#6a1fd0', // 6,4:1 no bloco lilás
};
const FONTE = "Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const FONTE_MARCA = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const FONTES_GOOGLE =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Outfit:wght@400;600&display=swap';
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

export type TipoCodigo = 'cadastro' | 'acesso' | 'senha';

type Conteudo = { titulo: string; paragrafos: string[]; seguranca: string; codigo?: string; minutos?: number };

const CODIGOS: Record<TipoCodigo, { rotulo: string; minutos: number; paragrafo: string; seguranca: string }> = {
  cadastro: {
    rotulo: 'Confirme seu e-mail',
    minutos: 15,
    paragrafo: 'Use o código abaixo para concluir seu cadastro no PsycheLink.',
    seguranca: 'Se você não criou uma conta, ignore este e-mail: nenhuma conta é ativada sem este código.',
  },
  acesso: {
    rotulo: 'Código de acesso',
    minutos: 10, // desafio_2fa
    paragrafo: 'Use o código abaixo para terminar de entrar na sua conta.',
    seguranca:
      'Se não foi você, alguém sabe a sua senha: troque-a assim que puder. A equipe do PsycheLink nunca pede este código.',
  },
  senha: {
    rotulo: 'Redefinição de senha',
    minutos: 15,
    paragrafo: 'Use o código abaixo para criar uma nova senha.',
    seguranca: 'Se você não pediu, ignore este e-mail: sua senha continua a mesma.',
  },
};

// O logo vem do próprio painel (public/Psychelink.png). Sem WEB_ORIGINS, sai só o nome.
const logo = () => {
  const origem = process.env.WEB_ORIGINS?.split(',')[0]?.trim();
  const nome = `<span style="font-family:${FONTE_MARCA};font-size:32px;line-height:40px;font-weight:600;color:${COR.texto};vertical-align:middle;">PsycheLink</span>`;
  if (!origem) return nome;
  return `<img src="${origem}/Psychelink.png" width="72" height="72" alt="" style="display:inline-block;width:72px;height:72px;border:0;vertical-align:middle;margin-right:12px;">${nome}`;
};

function montar({ titulo, paragrafos, seguranca, codigo, minutos }: Conteudo) {
  const previa = codigo ? `Seu código é ${codigo}. Ele expira em ${minutos} minutos.` : paragrafos[0];
  const p = (texto: string, cor = COR.texto, tamanho = 16) =>
    `<p style="margin:0 0 12px;font-family:${FONTE};font-size:${tamanho}px;line-height:${tamanho + 8}px;color:${cor};">${texto}</p>`;

  const blocoCodigo = codigo
    ? `<tr><td style="padding:8px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="center" style="background:${COR.blocoCodigo};border-radius:12px;padding:20px 12px;font-family:${MONO};font-size:32px;line-height:40px;font-weight:700;letter-spacing:8px;color:${COR.codigo};">${codigo}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 24px 0;">${p(`O código expira em ${minutos} minutos.`, COR.apoio, 14)}</td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<link href="${FONTES_GOOGLE}" rel="stylesheet">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:${COR.fundo};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previa}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.fundo};">
  <tr><td align="center" style="padding:24px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:8px 24px 0;">${logo()}</td></tr>
      <tr><td style="padding:24px 24px 4px;">
        <h1 style="margin:0 0 12px;font-family:${FONTE};font-size:24px;line-height:32px;font-weight:600;color:${COR.texto};">${titulo}</h1>
        ${paragrafos.map((texto) => p(texto)).join('\n        ')}
      </td></tr>
      ${blocoCodigo}
      <tr><td style="padding:12px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="border-top:1px solid ${COR.divisor};padding-top:16px;">${p(seguranca, COR.apoio, 14)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:20px 24px 0;">${p('PsycheLink · acompanhamento entre as sessões. Este e-mail é automático, não precisa responder.', COR.apoio, 12)}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const texto = [titulo, '', ...paragrafos, ...(codigo ? ['', `Código: ${codigo}`, `Expira em ${minutos} minutos.`] : []), '', seguranca, '', '— PsycheLink'].join('\n');
  return { html, texto };
}

export function emailDeCodigo(tipo: TipoCodigo, codigo: number) {
  const { rotulo, minutos, paragrafo, seguranca } = CODIGOS[tipo];
  const digitos = String(codigo).padStart(6, '0');
  return {
    assunto: `PsycheLink · ${rotulo}: ${digitos}`,
    ...montar({ titulo: rotulo, paragrafos: [paragrafo], seguranca, codigo: digitos, minutos }),
  };
}

// Cadastro tentado com um e-mail que já tem conta: o dono é avisado, sem código nenhum.
export function emailDeAvisoCadastro() {
  return {
    assunto: 'PsycheLink · Tentativa de cadastro com seu e-mail',
    ...montar({
      titulo: 'Alguém tentou criar uma conta com seu e-mail',
      paragrafos: [
        'Recebemos um pedido de cadastro no PsycheLink com este endereço, que já tem uma conta.',
        "Se foi você, entre normalmente ou use “Esqueci minha senha”. Se ainda não confirmou o cadastro, use o código que enviamos antes.",
      ],
      seguranca: 'Se não foi você, ignore esta mensagem: nada muda na sua conta.',
    }),
  };
}
