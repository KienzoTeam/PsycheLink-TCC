import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { checkinSchema } from '../schemas';
import { HABITOS } from '../lib/habitos';
import { verificarToken } from './auth';
import { criptografar, criptografarOuNulo, descriptografar } from '../lib/criptografia';
import { comContextoPaciente } from '../lib/contextoseguro';
import { obterOuCriarPacienteId, obterPacienteId } from '../lib/paciente';
import { lerSeguro } from '../lib/checkins';
import { checkinsDoPeriodo, resumirCheckins } from '../lib/resumo';

// Períodos do histórico e de Meus Dados (F4, F6): 7 dias, 30 dias, 3 meses e 12 meses.
const PERIODOS = new Set([7, 30, 90, 365]);
const TUDO = { humor: true, habitos: true, escalas: true, diario: true }; // o paciente vê tudo o que é dele

export const checkin = Router();

// Limite de requisições por rota
const limite = (n: number) => rateLimit({ windowMs: 15 * 60_000, limit: n });

const QUALIDADE_SONO_MAP: Record<'Ruim' | 'Regular' | 'Boa', number> = {
  Ruim: 1,
  Regular: 2,
  Boa: 3,
};

const QUALIDADE_SONO_REVERSO: Record<number, string> = {
  1: 'Ruim',
  2: 'Regular',
  3: 'Boa',
};


interface CheckinPostResultRow {
  id: number;
  data: string;
  criado_em: Date | string;
}

interface CheckinResumoRow {
  data: string;
  intensidade_humor: number | null;
  intensidade_ansiedade: number | null;
  emocao_predominante: string | null;
}

interface CheckinPainelRow {
  data: string;
  intensidade_humor: number | null;
  intensidade_ansiedade: number | null;
  horas_sono: number | null;
  qualidade_sono: number | null;
  emocao_predominante: string | null;
}


function formatarDataISO(data: Date): string {
  // Data local (calendário do dispositivo/servidor), não UTC: evita deslocar
  // o corte semanal em ±1 dia perto da meia-noite quando a coluna `data`
  // é DATE (dia corrido, sem fuso).
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function media(valores: Array<number | null | undefined>): number | null {
  const validos = valores.filter((v: number | null | undefined): v is number => v !== null && v !== undefined);
  if (validos.length === 0) return null;
  return validos.reduce((soma: number, v: number) => soma + Number(v), 0) / validos.length;
}

type DadosPercepcao = {
  humorMedio: number | null;
  humorMedioAnterior: number | null;
  ansiedadeMedia: number | null;
  ansiedadeMediaAnterior: number | null;
  sonoMedioHoras: number | null;
  checkinsEstaSemana: number;
  emocoesRecentes: string[];
  emocoesContagem: Record<string, number>;
};

// Geração de frases de acordo com as alterações de humor(simples)
function gerarPercepcao(d: DadosPercepcao): string {
  const candidatos: string[][] = [];

  if (d.humorMedio !== null && d.humorMedioAnterior !== null) {
    const diff = d.humorMedio - d.humorMedioAnterior;
    if (diff >= 0.5) {
      candidatos.push([
        'Seu humor tem melhorado nos últimos dias — bom sinal.',
        'Notamos uma evolução positiva no seu humor esta semana.',
        'Você tem se sentido cada vez melhor ultimamente.',
      ]);
    } else if (diff <= -0.5) {
      candidatos.push([
        'Seu humor caiu um pouco esta semana — vale se cuidar com carinho.',
        'Notamos uma queda no seu humor recente. Que tal um momento de autocuidado?',
        'Esta semana tem sido mais difícil emocionalmente — você não está sozinho.',
      ]);
    }
  }

  if (d.ansiedadeMedia !== null && d.ansiedadeMediaAnterior !== null) {
    const diff = d.ansiedadeMedia - d.ansiedadeMediaAnterior;
    if (diff <= -0.5) {
      candidatos.push([
        'Sua ansiedade diminuiu esta semana — continue assim.',
        'Você tem registrado menos ansiedade ultimamente, ótimo progresso.',
      ]);
    } else if (diff >= 0.5) {
      candidatos.push([
        'Sua ansiedade aumentou um pouco — que tal um exercício de respiração?',
        'Notamos mais ansiedade nos seus registros recentes. Respire fundo.',
      ]);
    }
  }

  if (d.sonoMedioHoras !== null) {
    if (d.sonoMedioHoras < 6) {
      candidatos.push([
        'Seu sono tem estado abaixo do ideal — descansar bem ajuda no equilíbrio emocional.',
        'Poucas horas de sono essa semana. Tente priorizar o descanso.',
      ]);
    } else if (d.sonoMedioHoras >= 7.5) {
      candidatos.push([
        'Você tem dormido bem — isso costuma refletir no seu bem-estar.',
        'Seu sono está numa boa média essa semana.',
      ]);
    }
  }

  if (d.checkinsEstaSemana >= 5) {
    candidatos.push([
      'Você está sendo consistente com seus check-ins — isso ajuda muito no acompanhamento.',
      'Ótima constância nos seus registros esta semana.',
    ]);
  } else if (d.checkinsEstaSemana > 0 && d.checkinsEstaSemana <= 2) {
    candidatos.push([
      'Poucos check-ins essa semana — que tal registrar como você está se sentindo hoje?',
      'Notamos poucos registros recentes. Sua jornada importa, mesmo nos dias corridos.',
    ]);
  }

  if (d.emocoesRecentes.length > 0) {
    const emocao = d.emocoesRecentes[0];
    // Só afirma frequência quando a emoção realmente se repetiu.
    if ((d.emocoesContagem[emocao] ?? 0) >= 2) {
      candidatos.push([
        `"${emocao}" tem aparecido bastante nos seus registros recentes.`,
        `Você tem sentido bastante "${emocao}" ultimamente.`,
      ]);
    }
  }

  if (candidatos.length === 0) {
    candidatos.push([
      'Continue registrando — quanto mais dados, melhores as percepções.',
      'Cada check-in ajuda a entender melhor sua jornada emocional.',
    ]);
  }

  const grupoEscolhido = candidatos[Math.floor(Math.random() * candidatos.length)];
  return grupoEscolhido[Math.floor(Math.random() * grupoEscolhido.length)];
}

// Registro do CheckIn
checkin.post(['/', '/checkins'], limite(20), verificarToken, async (req, res) => {
  const parsed = checkinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
  }

  const dados = parsed.data;

  const emocaoPredominante = criptografar(dados.emocoes.join(', '));
  const contextoGatilho = criptografarOuNulo(dados.contextos.join(', ') || null);
  const diarioLivre = criptografarOuNulo(dados.notas);
  const qualidadeSono = dados.qualidadeSono ? QUALIDADE_SONO_MAP[dados.qualidadeSono] : null;

  try {
    const pacienteId = await obterOuCriarPacienteId(req.user!.id);

    
    const { rows } = await comContextoPaciente(pacienteId, async (client) => {
      const inserido = await client.query<CheckinPostResultRow>(
        `INSERT INTO checkin_diario
           (paciente_id, emocao_predominante, intensidade_humor, intensidade_ansiedade,
            horas_sono, qualidade_sono, contexto_gatilho, diario_livre, diario_compartilhado,
            intensidade_emocao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, data, criado_em`,
        [
          pacienteId,
          emocaoPredominante,
          dados.humor,
          dados.ansiedade,
          dados.horasSono,
          qualidadeSono,
          contextoGatilho,
          diarioLivre,
          diarioLivre !== null && dados.diarioCompartilhado,
          dados.intensidade ?? null,
        ],
      );

      // Quem passou pela etapa de hábitos sem marcar nenhum também gera a linha.
      const marcados = new Set<string>(dados.habitos);
      await client.query(
        `INSERT INTO habito (checkin_id, ${HABITOS.map((h) => h.coluna).join(', ')})
         VALUES ($1, ${HABITOS.map((_, i) => `$${i + 2}`).join(', ')})`,
        [inserido.rows[0].id, ...HABITOS.map((h) => marcados.has(h.id))],
      );
      return inserido;
    });

    return res.status(201).json({ checkin: rows[0] });
  } catch (err: any) {
    if (err?.code === '23505' && err?.constraint === 'uk_paciente_data') {
      return res.status(409).json({ error: 'Você já registrou um check-in hoje.' });
    }

    console.error('Erro ao salvar check-in:', err);
    return res.status(500).json({ error: 'Erro interno ao salvar o check-in.' });
  }
});

// Resumo dos Graficos para o banco de dados.
checkin.get(['/resumo', '/checkins/resumo'], limite(60), verificarToken, async (req, res) => {
  try {
    const pacienteId = await obterPacienteId(req.user!.id);

    if (pacienteId === null) {
      return res.json({ serieTemporal: [], frequenciaEmocional: [] });
    }

    // Tipagem direta do resultado da consulta
    const { rows } = (await comContextoPaciente(pacienteId, (client) =>
      client.query(
        // Os 30 mais recentes, devolvidos em ordem crescente para o gráfico.
        `SELECT * FROM (
           SELECT to_char(data, 'YYYY-MM-DD') AS data,
                  intensidade_humor, intensidade_ansiedade, emocao_predominante
             FROM checkin_diario
            WHERE paciente_id = $1
            ORDER BY checkin_diario.data DESC
            LIMIT 30
         ) recentes
         ORDER BY data ASC`,
        [pacienteId],
      ),
    )) as { rows: CheckinResumoRow[] };

    const serieTemporal = rows.map((linha: CheckinResumoRow) => ({
      data: linha.data,
      humor: linha.intensidade_humor,
      ansiedade: linha.intensidade_ansiedade,
    }));

    const contagemEmocoes = new Map<string, number>();
    for (const linha of rows) {
      const cifrado: string | null = linha.emocao_predominante;
      if (!cifrado) continue;

      let bruto: string;
      try {
        bruto = descriptografar(cifrado);
      } catch (erro) {
        console.warn('Não foi possível descriptografar emocao_predominante:', erro);
        continue;
      }

      for (const emocao of bruto.split(',').map((e: string) => e.trim()).filter(Boolean)) {
        contagemEmocoes.set(emocao, (contagemEmocoes.get(emocao) ?? 0) + 1);
      }
    }

    const frequenciaEmocional = Array.from(contagemEmocoes.entries())
      .map(([emocao, quantidade]) => ({ emocao, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    return res.json({ serieTemporal, frequenciaEmocional });
  } catch (err) {
    console.error('Erro ao buscar resumo de check-ins:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar dados.' });
  }
});

// Histórico (F4) e Meus Dados (F6): check-ins do período, do mais novo para o mais antigo, com o resumo.
checkin.get(['/historico', '/checkins/historico'], limite(60), verificarToken, async (req, res) => {
  const dias = Number(req.query.dias ?? 30);
  if (!PERIODOS.has(dias)) return res.status(400).json({ error: 'Período inválido.' });

  try {
    const pacienteId = await obterPacienteId(req.user!.id);
    if (pacienteId === null) {
      return res.json({ dias, registros: [], frequenciaEmocional: [], habitos: null, distribuicaoHorario: null });
    }

    const linhas = await comContextoPaciente(pacienteId, (client) =>
      checkinsDoPeriodo(client, pacienteId, null, null, dias - 1),
    );
    const { registros, ...resumo } = resumirCheckins(linhas, TUDO);
    const porId = new Map(linhas.map((l) => [l.id, l]));
    return res.json({
      dias,
      ...resumo,
      registros: registros.reverse().map((r) => {
        const linha = porId.get(r.id)!;
        return { ...r, habitos: linha.habitos, notas: lerSeguro(linha.diario_livre), diarioCompartilhado: linha.diario_compartilhado };
      }),
    });
  } catch (err) {
    console.error('Erro ao buscar histórico de check-ins:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar o histórico.' });
  }
});

// Home Inicial
checkin.get(['/painel', '/checkins/painel'], limite(60), verificarToken, async (req, res) => {
  try {
    const pacienteId = await obterPacienteId(req.user!.id);

    if (pacienteId === null) {
      return res.json({ semDados: true });
    }

    const hoje = new Date();
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(hoje.getDate() - 6);
    const catorzeDiasAtras = new Date(hoje);
    catorzeDiasAtras.setDate(hoje.getDate() - 13);

    // Tipagem direta do resultado do painel
    const { rows } = (await comContextoPaciente(pacienteId, (client) =>
      client.query(
        `SELECT to_char(data, 'YYYY-MM-DD') AS data,
                intensidade_humor, intensidade_ansiedade, horas_sono,
                qualidade_sono, emocao_predominante
           FROM checkin_diario
          WHERE paciente_id = $1 AND data >= $2
          ORDER BY data DESC`,
        [pacienteId, formatarDataISO(catorzeDiasAtras)],
      ),
    )) as { rows: CheckinPainelRow[] };

    if (rows.length === 0) {
      // Distingue "nunca registrou" de "inativo há +14 dias": inativo recebe
      // métricas zeradas reais (0/7, sem médias), nunca exemplo nem semDados.
      const historico = (await comContextoPaciente(pacienteId, (client) =>
        client.query('SELECT 1 FROM checkin_diario WHERE paciente_id = $1 LIMIT 1', [
          pacienteId,
        ]),
      )) as { rows: unknown[] };

      if (historico.rows.length === 0) {
        return res.json({ semDados: true });
      }

      return res.json({
        semDados: false,
        inativo: true,
        humorMedio: null,
        humorVariacaoSemana: null,
        ansiedadeMedia: null,
        ansiedadeVariacaoSemana: null,
        sonoMedioHoras: null,
        qualidadeSonoPredominante: null,
        checkinsEstaSemana: 0,
        emocoesRecentes: [],
        percepcao: 'Faz um tempo que você não registra — que tal fazer um check-in hoje?',
      });
    }

    const corteSemanaAtual = formatarDataISO(seteDiasAtras);

    const estaSemana = rows.filter((r: CheckinPainelRow) => r.data >= corteSemanaAtual);
    const semanaAnterior = rows.filter((r: CheckinPainelRow) => r.data < corteSemanaAtual);

    const humorMedio = media(estaSemana.map((r: CheckinPainelRow) => r.intensidade_humor));
    const humorMedioAnterior = media(semanaAnterior.map((r: CheckinPainelRow) => r.intensidade_humor));
    const ansiedadeMedia = media(estaSemana.map((r: CheckinPainelRow) => r.intensidade_ansiedade));
    const ansiedadeMediaAnterior = media(semanaAnterior.map((r: CheckinPainelRow) => r.intensidade_ansiedade));
    const sonoMedioHoras = media(estaSemana.map((r: CheckinPainelRow) => r.horas_sono));

    const qualidadesEstaSemanaValidas = estaSemana
      .map((r: CheckinPainelRow) => r.qualidade_sono)
      .filter((v: number | null | undefined): v is number => v !== null && v !== undefined);

    let qualidadeSonoPredominante: string | null = null;
    if (qualidadesEstaSemanaValidas.length > 0) {
      const contagem = new Map<number, number>();
      qualidadesEstaSemanaValidas.forEach((q: number) => contagem.set(q, (contagem.get(q) ?? 0) + 1));
      const maisFrequente = Array.from(contagem.entries()).sort((a, b) => b[1] - a[1])[0][0];
      qualidadeSonoPredominante = QUALIDADE_SONO_REVERSO[maisFrequente] ?? null;
    }

    const contagemEmocoes = new Map<string, number>();
    for (const linha of rows.slice(0, 5)) {
      const cifrado: string | null = linha.emocao_predominante;
      if (!cifrado) continue;

      try {
        const decifrado = descriptografar(cifrado);
        decifrado
          .split(',')
          .map((e: string) => e.trim())
          .filter(Boolean)
          .forEach((e: string) => contagemEmocoes.set(e, (contagemEmocoes.get(e) ?? 0) + 1));
      } catch (erro) {
        console.warn('Não foi possível descriptografar emocao_predominante:', erro);
      }
    }
    // Mais frequentes primeiro, para a percepção de frequência ser sustentada.
    const emocoesRecentes = Array.from(contagemEmocoes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emocao]) => emocao);
    const emocoesContagem = Object.fromEntries(contagemEmocoes);

    const percepcao = gerarPercepcao({
      humorMedio,
      humorMedioAnterior,
      ansiedadeMedia,
      ansiedadeMediaAnterior,
      sonoMedioHoras,
      checkinsEstaSemana: estaSemana.length,
      emocoesRecentes,
      emocoesContagem,
    });

    return res.json({
      semDados: false,
      humorMedio: humorMedio !== null ? Number(humorMedio.toFixed(1)) : null,
      humorVariacaoSemana:
        humorMedio !== null && humorMedioAnterior !== null
          ? Number((humorMedio - humorMedioAnterior).toFixed(1))
          : null,
      ansiedadeMedia: ansiedadeMedia !== null ? Number(ansiedadeMedia.toFixed(1)) : null,
      ansiedadeVariacaoSemana:
        ansiedadeMedia !== null && ansiedadeMediaAnterior !== null
          ? Number((ansiedadeMedia - ansiedadeMediaAnterior).toFixed(1))
          : null,
      sonoMedioHoras: sonoMedioHoras !== null ? Number(sonoMedioHoras.toFixed(1)) : null,
      qualidadeSonoPredominante,
      checkinsEstaSemana: estaSemana.length,
      emocoesRecentes,
      percepcao,
    });
  } catch (err) {
    console.error('Erro ao montar painel:', err);
    return res.status(500).json({ error: 'Erro interno ao montar o painel.' });
  }
});