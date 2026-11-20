import { pool } from '../db';

// Texto da tela bloqueada: nada de conteúdo clínico, nome do psicólogo ou nome da escala.
// `tela` diz ao app qual aba abrir quando o paciente toca na notificação.
const MENSAGENS = {
  escala: {
    title: 'Nova escala para responder',
    body: 'Seu psicólogo pediu uma escala. Abra o app para responder.',
    data: { tela: 'Escalas' },
  },
  recomendacao: {
    title: 'Nova recomendação',
    body: 'Seu psicólogo recomendou um exercício.',
    data: { tela: 'BemEstar' },
  },
} as const;

export type TipoPush = keyof typeof MENSAGENS;

type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

/**
 * Avisa o celular do paciente pela API de push da Expo. Sem credencial FCM configurada a Expo
 * recusa a entrega e só isso acontece. Nunca lança: o fluxo do psicólogo não pode quebrar por isso.
 */
export async function avisarPaciente(pacienteId: number, tipo: TipoPush) {
  try {
    // Os mais novos primeiro; a API da Expo aceita até 100 mensagens por pedido.
    const { rows } = await pool.query<{ token: string }>(
      `SELECT d.token FROM push_dispositivo d JOIN paciente p ON p.user_id = d.user_id
        WHERE p.id = $1 ORDER BY d.criado_em DESC LIMIT 100`,
      [pacienteId],
    );
    if (!rows.length) return;

    const resposta = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { accept: 'application/json', 'accept-encoding': 'gzip, deflate', 'content-type': 'application/json' },
      body: JSON.stringify(rows.map(({ token }) => ({ to: token, channelId: 'avisos', sound: 'default', ...MENSAGENS[tipo] }))),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resposta.ok) {
      await resposta.body?.cancel();
      console.warn('Push do app falhou:', resposta.status);
      return;
    }
    // Um ticket por mensagem, na mesma ordem: o aparelho que desinstalou o app sai da tabela.
    const { data } = (await resposta.json()) as { data?: Ticket[] };
    const mortos = rows.filter((_, i) => data?.[i]?.status === 'error' && data[i].details?.error === 'DeviceNotRegistered');
    if (mortos.length) {
      await pool.query('DELETE FROM push_dispositivo WHERE token = ANY($1)', [mortos.map(({ token }) => token)]);
    }
  } catch (erro) {
    // Só o nome do erro: a mensagem de rede pode trazer a URL.
    console.warn('Push do app falhou:', erro instanceof Error ? erro.name : 'erro');
  }
}
