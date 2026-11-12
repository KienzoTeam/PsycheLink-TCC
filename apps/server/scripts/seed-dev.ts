/*
 * Dados de demonstração para o banco de DEV (nunca o da equipe). Idempotente: contas e vínculos são
 * reaproveitados, e os check-ins são refeitos a cada execução, sempre relativos a hoje.
 *
 *   cd apps/server && npx tsx --env-file=.env.test scripts/seed-dev.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import bcrypt from 'bcrypt';
import { Client } from 'pg';
import { criptografar } from '../src/lib/criptografia';

const SENHA = 'Demo!2026psy';
const DIAS = 30;

function recusar(motivo: string): never {
  console.error(`Seed recusado: ${motivo}`);
  process.exit(1);
}

// O seed só escreve no banco de .env.test: um `--env-file=.env` apontado para o banco da equipe é barrado aqui.
function urlDoBancoDeDev(): string {
  if (process.env.NODE_ENV === 'production') recusar('NODE_ENV=production.');
  const url = process.env.DATABASE_URL_DIRETA;
  if (!url) recusar('DATABASE_URL_DIRETA ausente.');
  const dev = parseEnv(readFileSync(join(__dirname, '..', '.env.test'), 'utf8')).DATABASE_URL_DIRETA;
  if (!dev || new URL(url).hostname !== new URL(dev).hostname) {
    recusar('o host do banco não é o de .env.test.');
  }
  return url;
}

// Gerador determinístico: a mesma execução sempre produz os mesmos registros.
function sorteador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Consentimento = { humor: boolean; habitos: boolean; escalas: boolean; diario: boolean };

type Perfil = {
  nome: string;
  email: string;
  consentimento: Consentimento | null;
  psicologo: 'a' | 'b' | null;
  vinculadoHaDias: number;
  // Dias atrás (0 = hoje) com check-in.
  dias: number[];
  // Horas locais (São Paulo) em que o paciente costuma registrar.
  horas: string[];
  humorBase: number;
  diario?: boolean;
  semente: number;
};

const todos = Array.from({ length: DIAS }, (_, i) => i);
const sem = (excluidos: number[]) => todos.filter((d) => !excluidos.includes(d));

const PACIENTES: Perfil[] = [
  {
    nome: 'Ana Souza',
    email: 'demo.paciente1@psychelink.test',
    consentimento: { humor: true, habitos: true, escalas: true, diario: false },
    psicologo: 'a',
    vinculadoHaDias: 29,
    dias: sem([5, 12, 20]),
    horas: ['08:10', '08:40', '13:20', '20:15'],
    humorBase: 6,
    semente: 11,
  },
  {
    nome: 'Bruno Lima',
    email: 'demo.paciente2@psychelink.test',
    consentimento: { humor: true, habitos: true, escalas: true, diario: true },
    psicologo: 'a',
    vinculadoHaDias: 24,
    dias: sem([1, 3, 7, 9, 14, 15, 21, 26]),
    horas: ['15:30', '18:45', '20:30', '11:00'],
    humorBase: 5,
    diario: true,
    semente: 23,
  },
  {
    // Esparso: 2 registros nos últimos 7 dias, e os demais mais antigos. Não compartilha hábitos.
    nome: 'Carla Mendes',
    email: 'demo.paciente3@psychelink.test',
    consentimento: { humor: true, habitos: false, escalas: false, diario: false },
    psicologo: 'a',
    vinculadoHaDias: 18,
    dias: [1, 4, 8, 9, 11, 13, 15, 16, 17],
    horas: ['01:40', '05:10', '09:30', '19:50'],
    humorBase: 7,
    semente: 37,
  },
  {
    // Não compartilha humor: os registros existem, mas o servidor não os mostra.
    nome: 'Diego Rocha',
    email: 'demo.paciente4@psychelink.test',
    consentimento: { humor: false, habitos: true, escalas: true, diario: false },
    psicologo: 'a',
    vinculadoHaDias: 12,
    dias: sem([2, 6, 10]),
    horas: ['07:30', '12:10'],
    humorBase: 4,
    semente: 41,
  },
  {
    // Compartilha humor e ainda não fez nenhum registro.
    nome: 'Elisa Prado',
    email: 'demo.paciente5@psychelink.test',
    consentimento: { humor: true, habitos: true, escalas: true, diario: false },
    psicologo: 'a',
    vinculadoHaDias: 3,
    dias: [],
    horas: [],
    humorBase: 6,
    semente: 53,
  },
  {
    nome: 'Fábio Teixeira',
    email: 'demo.paciente6@psychelink.test',
    consentimento: { humor: true, habitos: true, escalas: true, diario: false },
    psicologo: 'b',
    vinculadoHaDias: 10,
    dias: [0, 1, 2, 4, 5, 8, 9],
    horas: ['09:00', '17:30'],
    humorBase: 6,
    semente: 67,
  },
  {
    // Sem vínculo: serve para resgatar um código gerado pela web.
    nome: 'Gabriela Nunes',
    email: 'demo.paciente7@psychelink.test',
    consentimento: null,
    psicologo: null,
    vinculadoHaDias: 0,
    dias: [],
    horas: [],
    humorBase: 6,
    semente: 79,
  },
];

const PSICOLOGOS = {
  a: { nome: 'Marina Duarte', email: 'demo.psicologa@psychelink.test', crp: '06/100001', especialidade: 'Psicologia clínica' },
  b: { nome: 'Rafael Campos', email: 'demo.psicologo2@psychelink.test', crp: '06/100002', especialidade: 'Terapia cognitivo-comportamental' },
};

const EMOCOES = ['feliz', 'triste', 'ansioso', 'calmo', 'irritado', 'cansado'];
const GATILHOS = ['trabalho', 'familia', 'relacionamento', 'saude', 'financas'];
const DIARIO = [
  'Dormi mal e o dia foi corrido. Consegui fazer a caminhada no fim da tarde.',
  'Conversei com minha irmã sobre a mudança. Fiquei pensando nisso o resto do dia.',
  'Reunião longa no trabalho. Cheguei em casa cansado e fui deitar cedo.',
  'Dia tranquilo. Cozinhei e li um pouco antes de dormir.',
];

const limitar = (n: number, menor: number, maior: number) => Math.min(maior, Math.max(menor, Math.round(n)));

// Hora local de São Paulo (UTC-3) → hora UTC do criado_em. Todos os horários ficam no mesmo dia em UTC.
function horaUtc(local: string) {
  const [h, m] = local.split(':').map(Number);
  return `${String((h + 3) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function gerarCheckins(p: Perfil) {
  const sorteio = sorteador(p.semente);
  return p.dias.map((dias, i) => {
    const sono = limitar((6 + sorteio() * 3) * 2, 10, 18) / 2;
    const humor = limitar(p.humorBase + (sono - 7) * 0.9 + Math.sin(i / 3) * 1.2 + (sorteio() - 0.5) * 2, 1, 10);
    const ansiedade = limitar(10 - humor + (sorteio() - 0.5) * 3, 1, 10);
    const emocoes = [...new Set([EMOCOES[Math.floor(sorteio() * 6)]!, EMOCOES[Math.floor(sorteio() * 6)]!])];
    const gatilhos = sorteio() < 0.7 ? [GATILHOS[Math.floor(sorteio() * 5)]!, GATILHOS[Math.floor(sorteio() * 5)]!] : [];
    const comDiario = p.diario === true && i % 3 === 0;
    return {
      dias,
      hora: horaUtc(p.horas[Math.floor(sorteio() * p.horas.length)]!),
      emocao: criptografar(emocoes.join(', ')),
      humor,
      ansiedade,
      sono,
      qualidade: sono >= 7.5 ? 3 : sono >= 6.5 ? 2 : 1,
      gatilho: gatilhos.length ? criptografar([...new Set(gatilhos)].join(', ')) : null,
      diario: comDiario ? criptografar(DIARIO[i % DIARIO.length]!) : null,
      // Parte dos textos fica só com o paciente: o psicólogo lê o diário quando o registro é marcado como compartilhado.
      compartilhado: comDiario && i % 2 === 0,
      hidratacao: sorteio() < 0.6,
      exercicio: sorteio() < 0.45,
      meditacao: sorteio() < 0.3,
      limiteTelas: sorteio() < 0.35,
      contatoSocial: sorteio() < 0.55,
      medicacao: sorteio() < 0.8,
    };
  });
}

async function semear(db: Client) {
  const hash = await bcrypt.hash(SENHA, 10);
  const psicologoIds = { a: 0, b: 0 };

  for (const chave of ['a', 'b'] as const) {
    const p = PSICOLOGOS[chave];
    const usuario = await db.query<{ id: number }>(
      `INSERT INTO users (nome, email, password_hash, data_nascimento, email_verificado)
       VALUES ($1, $2, $3, '1984-04-12', true)
       ON CONFLICT (email) DO UPDATE
         SET nome = $1, password_hash = $3, email_verificado = true, tentativas_falhas = 0, bloqueio_acesso = NULL
       RETURNING id`,
      [p.nome, p.email, hash],
    );
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO psicologo (user_id, crp, especialidade) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET crp = $2, especialidade = $3
       RETURNING id`,
      [usuario.rows[0]!.id, p.crp, p.especialidade],
    );
    psicologoIds[chave] = rows[0]!.id;
  }

  for (const p of PACIENTES) {
    const usuario = await db.query<{ id: number }>(
      `INSERT INTO users (nome, email, password_hash, data_nascimento, email_verificado)
       VALUES ($1, $2, $3, '1992-09-03', true)
       ON CONFLICT (email) DO UPDATE
         SET nome = $1, password_hash = $3, email_verificado = true, tentativas_falhas = 0, bloqueio_acesso = NULL
       RETURNING id`,
      [p.nome, p.email, hash],
    );
    const userId = usuario.rows[0]!.id;
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO paciente (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id RETURNING id`,
      [userId],
    );
    const pacienteId = rows[0]!.id;

    if (p.consentimento) {
      const c = p.consentimento;
      await db.query(
        `INSERT INTO consentimento (paciente_id, compartilha_humor, compartilha_habitos, compartilha_escalas, compartilha_diario)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (paciente_id) DO UPDATE SET
           compartilha_humor = $2, compartilha_habitos = $3, compartilha_escalas = $4, compartilha_diario = $5`,
        [pacienteId, c.humor, c.habitos, c.escalas, c.diario],
      );
    }

    if (p.psicologo) {
      const psicologoId = psicologoIds[p.psicologo];
      // Um vínculo ativo por paciente: qualquer outro vínculo ativo deste paciente é encerrado.
      await db.query(
        `UPDATE vinculo SET status = 'encerrado', encerrado_em = now()
          WHERE paciente_id = $1 AND status = 'ativo' AND psicologo_id <> $2`,
        [pacienteId, psicologoId],
      );
      const ativo = await db.query(
        "SELECT 1 FROM vinculo WHERE paciente_id = $1 AND psicologo_id = $2 AND status = 'ativo'",
        [pacienteId, psicologoId],
      );
      if (!ativo.rowCount) {
        // criado_em é timestamp sem fuso, gravado em UTC.
        const vinculo = await db.query<{ id: number }>(
          `INSERT INTO vinculo (paciente_id, psicologo_id, status, criado_em)
           VALUES ($1, $2, 'ativo', (now() AT TIME ZONE 'UTC') - make_interval(days => $3))
           RETURNING id`,
          [pacienteId, psicologoId, p.vinculadoHaDias],
        );
        await db.query(
          `INSERT INTO auditoria (ator_user_id, ator_papel, acao, paciente_id, alvo_tipo, alvo_id, criado_em, metadados)
           VALUES ($1, 'paciente', 'vinculo_criado', $2, 'vinculo', $3,
                   now() - make_interval(days => $4) + interval '1 minute', '{"seed":"demo"}')`,
          [userId, pacienteId, String(vinculo.rows[0]!.id), p.vinculadoHaDias],
        );
      }
    }

    // A auditoria é imutável: o evento só entra uma vez, e mesmo assim guarda a marca do seed.
    if (p.psicologo && p.consentimento) {
      await db.query(
        `INSERT INTO auditoria (ator_user_id, ator_papel, acao, paciente_id, alvo_tipo, criado_em, metadados)
         SELECT $1, 'paciente', 'consentimento_alterado', $2, 'consentimento',
                now() - make_interval(days => $3), '{"seed":"demo"}'
          WHERE NOT EXISTS (
            SELECT 1 FROM auditoria WHERE paciente_id = $2 AND acao = 'consentimento_alterado' AND metadados->>'seed' = 'demo')`,
        [userId, pacienteId, Math.max(1, Math.floor(p.vinculadoHaDias / 2))],
      );
    }

    await db.query('DELETE FROM checkin_diario WHERE paciente_id = $1', [pacienteId]);
    const registros = gerarCheckins(p);
    if (registros.length === 0) continue;

    const inseridos = await db.query<{ id: number; dias: number }>(
      `INSERT INTO checkin_diario
         (paciente_id, data, criado_em, emocao_predominante, intensidade_humor, intensidade_ansiedade,
          horas_sono, qualidade_sono, contexto_gatilho, diario_livre, diario_compartilhado)
       SELECT $1, CURRENT_DATE - d.dias, (CURRENT_DATE - d.dias) + d.hora, d.emocao, d.humor, d.ansiedade,
              d.sono, d.qualidade, d.gatilho, d.diario, d.compartilhado
         FROM unnest($2::int[], $3::time[], $4::text[], $5::int[], $6::int[], $7::numeric[], $8::int[], $9::text[], $10::text[], $11::boolean[])
              AS d(dias, hora, emocao, humor, ansiedade, sono, qualidade, gatilho, diario, compartilhado)
       RETURNING id, (CURRENT_DATE - data) AS dias`,
      [
        pacienteId,
        registros.map((r) => r.dias),
        registros.map((r) => r.hora),
        registros.map((r) => r.emocao),
        registros.map((r) => r.humor),
        registros.map((r) => r.ansiedade),
        registros.map((r) => r.sono),
        registros.map((r) => r.qualidade),
        registros.map((r) => r.gatilho),
        registros.map((r) => r.diario),
        registros.map((r) => r.compartilhado),
      ],
    );
    const porDia = new Map(registros.map((r) => [r.dias, r]));
    await db.query(
      `INSERT INTO habito (checkin_id, hidratacao, exercicio, meditacao, limite_telas, contato_social, medicacao)
       SELECT * FROM unnest($1::int[], $2::boolean[], $3::boolean[], $4::boolean[], $5::boolean[], $6::boolean[], $7::boolean[])`,
      [
        inseridos.rows.map((r) => r.id),
        inseridos.rows.map((r) => porDia.get(r.dias)!.hidratacao),
        inseridos.rows.map((r) => porDia.get(r.dias)!.exercicio),
        inseridos.rows.map((r) => porDia.get(r.dias)!.meditacao),
        inseridos.rows.map((r) => porDia.get(r.dias)!.limiteTelas),
        inseridos.rows.map((r) => porDia.get(r.dias)!.contatoSocial),
        inseridos.rows.map((r) => porDia.get(r.dias)!.medicacao),
      ],
    );
  }

  console.log(`Psicólogos: ${Object.values(PSICOLOGOS).map((p) => p.email).join(', ')}`);
  console.log(`Pacientes: ${PACIENTES.map((p) => p.email).join(', ')}`);
}

async function main() {
  const db = new Client({ connectionString: urlDoBancoDeDev() });
  await db.connect();
  try {
    await db.query('BEGIN');
    await semear(db);
    await db.query('COMMIT');
    console.log('Seed concluído.');
  } catch (erro) {
    await db.query('ROLLBACK');
    throw erro;
  } finally {
    await db.end();
  }
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
