import { EMAIL_SUPORTE } from './contato';

// Versão enviada ao servidor no cadastro (aceite registrado com data e hora). Muda junto com o texto.
export const VERSAO_DOCUMENTOS = '2026-11-20';
export const DATA_DOCUMENTOS = '20 de novembro de 2026';

const CONTATO = EMAIL_SUPORTE
  ? `Para dúvidas ou pedidos que não possam ser feitos no aplicativo, escreva para ${EMAIL_SUPORTE}.`
  : 'O projeto ainda não tem um e-mail de contato. Por isso, tudo o que este documento descreve pode ser feito direto no aplicativo.';

// A tela de leitura separa os blocos por linha em branco e trata como título o bloco que começa com "1.", "2." etc.
// Por isso nenhum parágrafo comum pode começar assim.

export const Termos_De_Uso = `Estes Termos de Uso explicam as regras para usar o aplicativo PsycheLink. O PsycheLink é um projeto acadêmico, sem fins comerciais: o Trabalho de Conclusão de Curso (TCC) de uma Etec de São José dos Campos, feito pela equipe do projeto PsycheLink (TCC). Ao criar sua conta, você confirma que leu e concorda com estes termos.

1. Sobre o PsycheLink

O PsycheLink ajuda você a registrar como está se sentindo entre uma consulta e outra: check-ins de humor, sono e hábitos, diário, escalas enviadas pelo seu psicólogo, consultas marcadas, exercícios de bem-estar e uma tela de SOS. Se você tiver um psicólogo vinculado, ele vê somente o que você escolher compartilhar.

O PsycheLink não é um serviço de saúde. Ele não faz diagnóstico, não indica tratamento e não substitui consulta com psicólogo, psiquiatra ou outro profissional de saúde. Gráficos e escalas mostram os registros que você fez, e quem os interpreta é o profissional.

O aplicativo não tem troca de mensagens com o psicólogo. Para falar com ele, use o meio que vocês combinaram.

2. Sua conta

Para criar a conta você informa nome, e-mail, data de nascimento e uma senha. As informações devem ser verdadeiras. O PsycheLink foi pensado para maiores de 18 anos; se você for menor de idade, use o aplicativo somente com a autorização de um responsável legal.

Você confirma o e-mail com um código de 6 dígitos enviado ao endereço informado. Ao entrar, o aplicativo envia outro código de 6 dígitos para o seu e-mail (verificação em duas etapas). Se você marcar para confiar naquele celular, o código deixa de ser pedido por 30 dias, mas a senha continua obrigatória.

A conta é pessoal. Guarde sua senha e não a compartilhe. Se suspeitar que alguém entrou na sua conta, troque a senha em Configurações da Conta.

A ligação com um psicólogo só acontece quando você digita o código de 6 dígitos que o próprio profissional gera. O PsycheLink não indica nem recomenda psicólogos.

3. Como usar

Use o aplicativo de forma ética e de acordo com a lei. Não tente entrar na conta de outra pessoa, burlar a segurança do sistema ou usar o aplicativo para prejudicar alguém. Você é responsável pelo que registra e escreve.

Os registros que você cria (check-ins, diário, respostas) continuam sendo seus.

4. Em caso de crise

O PsycheLink não é um canal de emergência e não acompanha seus registros em tempo real. Em situação de risco imediato à sua vida ou à de outra pessoa, ligue para o CVV (188, gratuito, 24 horas), para o SAMU (192) ou vá à UPA ou ao pronto-socorro mais próximo.

5. Limites do serviço

Como projeto acadêmico, o aplicativo é oferecido como está, sem garantia de funcionar sem interrupções. Ele pode ficar fora do ar, mudar ou ser encerrado. Se quiser guardar uma cópia dos seus dados, exporte-os em Privacidade e Segurança.

A equipe não se responsabiliza por decisões tomadas apenas com base no que o aplicativo mostra. Decisões sobre sua saúde devem ser conversadas com um profissional.

6. Propriedade intelectual

Os textos, as telas, o logotipo e o código do aplicativo são trabalho da equipe do projeto PsycheLink (TCC). Não os reproduza nem os use para fins comerciais sem autorização da equipe.

7. Encerramento da conta

Você pode apagar sua conta quando quiser, em Configurações da Conta. A exclusão fica agendada e a conta é apagada de vez 30 dias depois; nesse prazo você pode cancelar. A Política de Privacidade explica o que acontece com cada dado.

A equipe pode suspender ou encerrar contas usadas de forma que viole estes termos.

8. Mudanças nestes termos

A data de atualização aparece no topo de cada documento. No cadastro, o aplicativo registra a versão dos documentos que você aceitou, com data e hora.

9. Contato

${CONTATO}`;

export const Politica_Privacidade = `Esta Política de Privacidade explica quais dados o PsycheLink guarda, para que, com quem são compartilhados e como você controla tudo isso, conforme a Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018). O controlador dos dados é a equipe do projeto PsycheLink (TCC), um trabalho acadêmico sem fins comerciais de uma Etec de São José dos Campos.

1. Dados que guardamos

Cadastro: nome, e-mail, data de nascimento e senha. A senha é guardada apenas de forma irreversível (hash bcrypt), nunca em texto legível.

Seus registros: nos check-ins, as emoções, a intensidade do humor e da ansiedade, as horas e a qualidade do sono, os contextos e hábitos do dia e o texto que você escrever; as entradas do diário; as respostas às escalas que seu psicólogo enviar.

Vínculo e escolhas: com qual psicólogo você está vinculado e desde quando, e o que você escolheu compartilhar.

Recomendações: os exercícios que o psicólogo vinculado recomendar a você (com o texto dele cifrado) e se você marcou como feito.

Uso do SOS: somente se você ligar essa opção, a data e a hora em que abriu a tela de SOS. O que você faz nela nunca é registrado.

Segurança: ações importantes da conta (verificação em duas etapas, troca de senha, vínculo e encerramento do vínculo, mudança do compartilhamento, exportação de dados, exclusão da conta) ficam registradas com data, hora, endereço IP e tipo de aparelho ou navegador. Quando você confia em um celular, guardamos um identificador dele (apenas o hash) e o tipo de aparelho.

Avisos no celular: os lembretes de check-in são agendados só no aparelho. Se você ligar os avisos do seu psicólogo (escala ou recomendação nova), guardamos o identificador de notificações do celular; desligar apaga esse identificador. O texto do aviso não traz conteúdo clínico.

No seu celular: o token de acesso fica no armazenamento seguro do aparelho. Os contatos de confiança da tela de SOS ficam somente no celular e não são enviados ao servidor. O aplicativo só lê a agenda se você pedir para escolher um contato e der a permissão.

O aplicativo não usa localização nem ferramentas de publicidade ou de análise de uso.

2. Para que usamos seus dados

Usamos seus dados para: (a) criar e proteger sua conta; (b) mostrar a você seus registros, gráficos e resumos; (c) mostrar ao psicólogo vinculado o que você escolheu compartilhar; (d) enviar por e-mail os códigos de verificação; (e) manter o registro de segurança e cumprir obrigações legais.

Não usamos seus dados para publicidade e não os vendemos nem os cedemos a terceiros.

3. Base legal

Informações sobre saúde mental são dados pessoais sensíveis (art. 11 da LGPD). Elas são tratadas com base no seu consentimento específico e destacado, dado no cadastro e descrito no documento de Consentimento para Tratamento de Dados Sensíveis. Você pode revogá-lo a qualquer momento.

Os dados de cadastro são tratados para criar sua conta e prestar o serviço que você pediu. Os registros de segurança são mantidos para proteger a conta e atender a obrigações legais.

4. Com quem compartilhamos

Psicólogo vinculado: ele só tem acesso enquanto o vínculo estiver ativo e somente ao que você liberou, por categoria: humor e emoções; hábitos e sono; escalas; textos do diário (liberados um a um); uso do SOS. Se você ainda não tiver definido suas escolhas, ao se vincular humor, hábitos e escalas começam compartilhados, e diário e SOS começam desligados. Você muda tudo isso em Psicólogo e privacidade, quando quiser. O psicólogo também vê o seu nome. Ele está sujeito ao sigilo profissional do Código de Ética Profissional do Psicólogo (Resolução CFP nº 010/2005).

Ao encerrar o vínculo, o psicólogo deixa de ter acesso aos seus registros.

Serviços técnicos: o servidor e o banco de dados ficam em serviços de nuvem, os códigos de verificação são enviados por um serviço de envio de e-mail e, se você ligar os avisos, as notificações passam pelos serviços de notificação do Expo e do Google. Eles processam os dados só para o aplicativo funcionar.

Não compartilhamos seus dados com mais ninguém, exceto por obrigação legal ou decisão judicial.

5. Quanto tempo guardamos

Guardamos seus dados enquanto sua conta existir. Quando você pede a exclusão em Configurações da Conta, a conta fica agendada e é apagada de vez 30 dias depois. Nesse prazo você pode cancelar. Ao agendar, seu vínculo com o psicólogo é encerrado e as sessões e os celulares confiáveis são desconectados.

Quando a conta é apagada, seus check-ins, diário, respostas às escalas, escolhas de compartilhamento e demais registros ligados a você são apagados junto.

Há duas exceções. A primeira são as anotações que o psicólogo escreveu sobre você: elas são registro profissional dele e, pela guarda de 5 anos prevista pelo CFP, continuam com ele, cifradas e sem ligação com a sua conta. O texto é do psicólogo e pode citar você. A segunda são os registros de segurança: eles são imutáveis e não podem ser apagados. Ao apagar a conta, a ligação deles com você é removida, mas data, tipo de ação, IP e aparelho continuam nesses registros.

6. Seus direitos e onde exercê-los

A LGPD garante a você, entre outros direitos: confirmar que tratamos seus dados e acessá-los; corrigi-los; levá-los com você (portabilidade); pedir a eliminação dos dados tratados com consentimento; saber com quem foram compartilhados; e revogar o consentimento. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).

No aplicativo você faz isto direto: (a) acessar e levar seus dados: Privacidade e Segurança, exportar em PDF ou JSON; (b) revogar ou mudar o compartilhamento, parar de compartilhar o diário e encerrar o vínculo: Psicólogo e privacidade; (c) desconectar celulares confiáveis: Privacidade e Segurança; (d) apagar a conta e os dados: Configurações da Conta; (e) corrigir o nome: Configurações da Conta. E-mail e data de nascimento ainda não podem ser alterados pelo aplicativo.

Outros pedidos previstos na LGPD, como anonimização ou bloqueio de dados, devem ser feitos pelo contato indicado no fim deste documento.

7. Segurança

As conexões entre o aplicativo e o servidor usam HTTPS. Emoções, contextos, textos de check-in e de diário e respostas às escalas são cifrados no servidor com AES-256-GCM antes de irem para o banco. Os demais dados, como nome, e-mail, notas de humor e horas de sono, ficam no banco sem essa cifragem e são protegidos pelos controles de acesso.

O banco de dados aplica regras de acesso por linha (RLS): cada conta só consegue ler os registros que a regra permite, e o psicólogo só lê pacientes com vínculo ativo. Os acessos do psicólogo aos dados de um paciente (painel, check-ins, escalas, anotações e relatórios) ficam em um registro de auditoria imutável. O acesso à conta exige verificação em duas etapas por e-mail, a menos que você tenha marcado um celular como confiável.

Nenhuma medida elimina todo risco. Se houver um incidente de segurança que afete seus dados, a LGPD exige comunicar a ANPD e os titulares afetados, e a equipe seguirá essa regra.

8. Contato

${CONTATO}`;

export const Consentimento_Dados = `Este documento pede o seu consentimento específico e destacado para tratar dados pessoais sensíveis no PsycheLink, como exige o art. 11 da LGPD (Lei nº 13.709/2018). Leia com calma antes de aceitar. Você pode não aceitar, mas então não conseguirá criar a conta, porque o aplicativo existe para registrar esse tipo de informação.

1. O que são dados sensíveis

A LGPD chama de dados sensíveis aqueles que merecem proteção extra, como os referentes à saúde. No PsycheLink, são os registros sobre a sua saúde mental.

2. Quais dados sensíveis você registra

Check-ins: emoções, intensidade do humor e da ansiedade, horas e qualidade do sono, contextos, hábitos e o texto que você escrever.

Diário: as entradas de texto que você criar.

Escalas: suas respostas às escalas psicológicas que o psicólogo vinculado enviar. O resultado é um número calculado a partir das respostas e não é diagnóstico.

Uso do SOS: somente se você ligar essa opção, a data e a hora em que abriu a tela de SOS. Nunca o que você fez nela.

3. Para que tratamos esses dados

Tratamos esses dados para: (a) mostrar a você seus registros, gráficos e resumos; (b) mostrar ao psicólogo vinculado apenas o que você liberar.

Não usamos esses dados para publicidade, não os vendemos e não os usamos para nenhuma outra finalidade.

4. Quem pode ver

O psicólogo vinculado, e somente enquanto o vínculo estiver ativo. Cada categoria é uma escolha sua e independente: humor e emoções; hábitos e sono; escalas; textos do diário (um a um, em cada check-in ou entrada); uso do SOS. Se você ainda não tiver definido suas escolhas, ao se vincular humor, hábitos e escalas começam compartilhados, e diário e SOS começam desligados. Se você desligar uma categoria, o psicólogo deixa de ver aquele tipo de registro.

O psicólogo está sujeito ao sigilo profissional (Código de Ética Profissional do Psicólogo, Resolução CFP nº 010/2005). Os acessos dele aos dados de um paciente ficam em um registro de auditoria imutável.

A equipe do projeto, que mantém o servidor, tem acesso técnico ao banco de dados e à chave de cifragem. Esse acesso serve apenas para manter o sistema funcionando. Textos e emoções ficam cifrados no banco.

5. Por quanto tempo

Enquanto sua conta existir. Se você pedir a exclusão, a conta é apagada de vez 30 dias depois, com os seus registros. As anotações que o psicólogo escreveu sobre você ficam com ele por 5 anos, sem ligação com a sua conta, como exige a guarda de documentos do CFP. Os detalhes estão na Política de Privacidade.

6. Como revogar o consentimento

Você pode revogar quando quiser, sem custo e sem penalidade. Em Psicólogo e privacidade, desligue as categorias que não quer mais compartilhar, pare de compartilhar o diário ou encerre o vínculo. O efeito sobre o que o psicólogo enxerga é imediato. Para apagar de vez os seus dados, use Configurações da Conta.

A revogação não desfaz o que o psicólogo já viu antes dela nem as anotações que ele já escreveu. Os seus registros continuam no seu aplicativo, e você pode continuar usando-o sem compartilhar nada.

7. Seus direitos

Além de revogar, você tem os demais direitos da LGPD, como acesso, correção, portabilidade e eliminação. A Política de Privacidade mostra onde exercer cada um no aplicativo.

8. Contato

${CONTATO}`;

export const Aviso_Etico = `Este aviso diz com clareza o que o PsycheLink é, o que ele não é e quais limites você precisa conhecer antes de usá-lo.

1. O que é o PsycheLink

O PsycheLink é um aplicativo de apoio ao acompanhamento psicológico. Ele serve para você registrar como está entre uma consulta e outra e, se quiser, deixar esses registros à disposição do seu psicólogo.

É um projeto acadêmico, sem fins comerciais: o Trabalho de Conclusão de Curso (TCC) de uma Etec de São José dos Campos. Não é um serviço de saúde nem uma clínica.

2. O que o PsycheLink não faz

O aplicativo não faz diagnóstico, não indica medicamento ou tratamento e não substitui atendimento com psicólogo, psiquiatra ou outro profissional de saúde.

As escalas são instrumentos de acompanhamento. O aplicativo não as interpreta como diagnóstico: a leitura dos resultados é do psicólogo que as enviou, dentro do atendimento.

Os exercícios de bem-estar, como os de respiração, são de autocuidado e não substituem tratamento.

3. Limites do aplicativo

O PsycheLink não é atendimento de crise e não acompanha seus registros em tempo real. Escrever algo no check-in ou no diário não chama ajuda. O psicólogo vê o que você registrou quando abre o painel dele, e só o que você liberou.

A tela de SOS oferece atalhos para ligar ou conversar por chat com o CVV e para falar com os contatos de confiança que você cadastrar. Esses contatos ficam só no seu celular.

4. Em caso de crise ou emergência

Se você estiver em sofrimento intenso, pensando em se machucar ou em acabar com a própria vida, ou se houver risco imediato para você ou para outra pessoa, procure ajuda agora.

CVV, Centro de Valorização da Vida: ligue 188, gratuito, 24 horas por dia. Também há chat em cvv.org.br/chat.

SAMU: ligue 192 para emergências médicas, inclusive em crise psiquiátrica.

UPA ou pronto-socorro: vá à unidade mais próxima ou peça a alguém de confiança que vá com você.

5. Seu papel

Você decide o que registra e o que o psicólogo vê. As decisões sobre a sua saúde continuam sendo suas e dos profissionais que acompanham você. Use o aplicativo como complemento, nunca como substituto do atendimento.

6. Como o aplicativo trata essas regras

O psicólogo só vê seus registros com vínculo ativo e dentro das categorias que você liberou. Seus dados não são usados para publicidade. Os avisos que o psicólogo recebe sobre você não carregam conteúdo clínico.

O psicólogo vinculado tem deveres éticos próprios, como o sigilo previsto no Código de Ética Profissional do Psicólogo (Resolução CFP nº 010/2005). O aplicativo não substitui o julgamento dele.

7. Contato

${CONTATO}`;
