// Documentos do cadastro do psicólogo. Cada afirmação confere com o que o sistema faz hoje; se o
// sistema mudar, o texto muda junto e a versão sobe (o aceite é registrado com a versão).

// E-mail de suporte do projeto. Quando existir, é só preencher: os documentos passam a mostrá-lo.
export const EMAIL_SUPORTE: string | null = 'suporte.psychelink@gmail.com';

export const VERSAO_DOCUMENTOS = '2026-11-20';
export const DATA_DOCUMENTOS = '20 de novembro de 2026';

const CONTATO = EMAIL_SUPORTE
  ? `Para dúvidas ou pedidos que não possam ser feitos no painel, escreva para ${EMAIL_SUPORTE}.`
  : 'O projeto ainda não tem um e-mail de contato. O que este documento descreve pode ser feito direto no painel.';

export type Secao = { titulo?: string; paragrafos: string[] };

export const TERMOS_PSICOLOGO: Secao[] = [
  {
    paragrafos: [
      'Estes Termos de Uso valem para psicólogos que usam o painel web do PsycheLink. O PsycheLink é um projeto acadêmico, sem fins comerciais: o Trabalho de Conclusão de Curso (TCC) de uma Etec de São José dos Campos, feito pela equipe do projeto PsycheLink. Ao criar sua conta, você confirma que leu e concorda com estes termos.',
    ],
  },
  {
    titulo: '1. O que o painel faz',
    paragrafos: [
      'O painel mostra, para pacientes vinculados a você, os registros que eles escolheram compartilhar: check-ins, hábitos e sono, escalas, textos do diário e uso do SOS. Também permite pedir escalas, marcar consultas, escrever anotações clínicas privadas, recomendar exercícios e gerar relatórios.',
      'O sistema não faz diagnóstico. Médias, gráficos, correlações e pontuações de escalas são estatística descritiva sobre o que o paciente registrou. A interpretação clínica é sua.',
    ],
  },
  {
    titulo: '2. Cadastro e acesso',
    paragrafos: [
      'Para criar a conta você informa nome, e-mail, data de nascimento, CRP e, se quiser, especialidade. Você declara ter registro ativo no Conselho Regional de Psicologia. O sistema confere apenas o formato do CRP; a equipe pode verificar o registro no cadastro do Conselho e suspender contas irregulares.',
      'O e-mail é confirmado por um código de 6 dígitos, e cada entrada no painel pede outro código enviado por e-mail (verificação em duas etapas). Você pode confiar em um navegador por 30 dias; a senha continua obrigatória. A conta é pessoal: não a compartilhe.',
    ],
  },
  {
    titulo: '3. Vínculo com pacientes',
    paragrafos: [
      'O vínculo começa quando o paciente digita no aplicativo o código de 6 dígitos que você gerou no painel. O código vale por 24 horas e serve uma vez. O PsycheLink não indica pacientes nem divulga profissionais.',
      'O paciente escolhe, por categoria, o que você vê, e pode mudar ou encerrar o vínculo a qualquer momento. Ao encerrar, você deixa de ver os registros dele na hora.',
    ],
  },
  {
    titulo: '4. Sua responsabilidade profissional',
    paragrafos: [
      'O uso do painel não muda seus deveres éticos. Você responde pelo uso de tecnologias digitais no atendimento conforme a Resolução CFP nº 9/2024 e pelo sigilo previsto no Código de Ética Profissional do Psicólogo (Resolução CFP nº 10/2005).',
      'O painel não acompanha pacientes em tempo real e não é canal de emergência. O aviso de que um paciente abriu o SOS só existe se ele permitir, informa apenas que a tela foi aberta e não é pedido de atendimento. O aplicativo orienta o paciente a ligar para o 188 ou o 192 em situação de risco.',
      'Use os dados dos pacientes só para o acompanhamento deles. Não copie nem repasse dados fora do painel sem base legal ou ética.',
    ],
  },
  {
    titulo: '5. Anotações clínicas',
    paragrafos: [
      'As anotações são visíveis só para você, ficam cifradas no banco e são guardadas por 5 anos, como pede o CFP. Depois que o vínculo termina ou o paciente exclui a conta, elas continuam disponíveis para leitura em Anotações arquivadas.',
    ],
  },
  {
    titulo: '6. Limites do serviço',
    paragrafos: [
      'Como projeto acadêmico, o painel é oferecido como está, sem garantia de funcionar sem interrupções. Ele pode ficar fora do ar, mudar ou ser encerrado. Os relatórios em PDF servem para você guardar o que precisar.',
    ],
  },
  {
    titulo: '7. Encerramento da conta',
    paragrafos: [
      'Você pode excluir a conta em Minha área enquanto ela nunca tiver tido paciente vinculado. Depois do primeiro vínculo, a exclusão é bloqueada para que o registro clínico seja guardado. A equipe pode suspender contas usadas em desacordo com estes termos.',
    ],
  },
  { titulo: '8. Contato', paragrafos: [CONTATO] },
];

export const POLITICA_PSICOLOGO: Secao[] = [
  {
    paragrafos: [
      'Esta Política de Privacidade explica como o PsycheLink trata os seus dados de profissional e os dados dos pacientes que você acessa pelo painel, conforme a Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018). O controlador é a equipe do projeto PsycheLink, um trabalho acadêmico sem fins comerciais.',
    ],
  },
  {
    titulo: '1. Seus dados',
    paragrafos: [
      'Cadastro: nome, e-mail, data de nascimento, CRP e especialidade. A senha é guardada só como hash (bcrypt), nunca legível.',
      'Perfil profissional: abordagem, modalidades, onde atende, apresentação e contato, se você preencher. Esse perfil aparece só para os pacientes vinculados a você.',
      'Uso do painel: sessões abertas (data, endereço IP e navegador), navegadores confiáveis (só o hash do identificador), suas preferências de avisos e, se você ativar o push, o endereço de inscrição do navegador.',
      'Registro de auditoria: suas ações no painel e cada acesso a dados de um paciente ficam registrados com data, hora, IP e navegador, de forma imutável.',
    ],
  },
  {
    titulo: '2. Dados de pacientes que você acessa',
    paragrafos: [
      'Você vê apenas pacientes com vínculo ativo e apenas as categorias que cada um liberou. O banco de dados aplica regras de acesso por linha (RLS) além das regras do sistema. Textos, emoções e respostas de escalas ficam cifrados (AES-256-GCM) no banco.',
      'O que você escreve sobre o paciente (anotações e o texto das recomendações) também fica cifrado. O paciente não vê as anotações; vê as recomendações que você enviar.',
    ],
  },
  {
    titulo: '3. Avisos',
    paragrafos: [
      'O painel avisa sobre eventos como vínculo novo, escala respondida e uso do SOS. O e-mail e o push do navegador não trazem nome nem dado clínico do paciente, só o tipo do aviso. Você escolhe em Minha área por onde receber cada um.',
    ],
  },
  {
    titulo: '4. Com quem compartilhamos',
    paragrafos: [
      'Seus pacientes vinculados veem seu nome, CRP e o perfil profissional que você preencher. O servidor e o banco ficam em serviços de nuvem, os e-mails saem por um serviço de envio de e-mail e o push passa pelo serviço do seu navegador. Eles processam os dados só para o sistema funcionar. Não vendemos dados nem os usamos para publicidade.',
    ],
  },
  {
    titulo: '5. Quanto tempo guardamos',
    paragrafos: [
      'Seus dados ficam enquanto a conta existir. As anotações clínicas ficam 5 anos a partir de quando foram escritas. O registro de auditoria é imutável: se uma conta for excluída, a ligação com a pessoa é removida, mas a data, o tipo de ação, o IP e o navegador continuam nele.',
    ],
  },
  {
    titulo: '6. Seus direitos',
    paragrafos: [
      'A LGPD garante a você acesso, correção, portabilidade, eliminação e informação sobre compartilhamento dos seus dados, além de reclamar à Autoridade Nacional de Proteção de Dados (ANPD). No painel, você corrige nome e especialidade e edita o perfil em Minha área, vê e encerra sessões, esquece navegadores confiáveis e, sem vínculos, exclui a conta. Outros pedidos vão pelo contato abaixo.',
    ],
  },
  {
    titulo: '7. Segurança',
    paragrafos: [
      'As conexões usam HTTPS. A sessão do painel fica em cookie protegido (HttpOnly) e cada entrada pede o código de verificação. Nenhuma medida elimina todo risco; em caso de incidente que afete dados pessoais, a LGPD exige comunicar a ANPD e os titulares, e a equipe seguirá essa regra.',
    ],
  },
  { titulo: '8. Contato', paragrafos: [CONTATO] },
];
