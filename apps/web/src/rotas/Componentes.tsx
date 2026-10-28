import { useState, type ReactNode } from 'react';
import { getLocalTimeZone, today } from '@internationalized/date';
import { Palette, Plus, Settings, Users } from 'lucide-react';
import { Shell } from '../components/shell/Shell';
import { Button } from '../components/ui/Button';
import { Calendar } from '../components/ui/Calendar';
import { Card } from '../components/ui/Card';
import { Chip, ChipFiltro, type Emocao } from '../components/ui/Chip';
import { ConsentimentoAusente } from '../components/ui/ConsentimentoAusente';
import { DateRangePicker, type Periodo } from '../components/ui/DateRangePicker';
import { Dialog } from '../components/ui/Dialog';
import { Disclaimer } from '../components/ui/Disclaimer';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { ListItem } from '../components/ui/ListItem';
import { Menu } from '../components/ui/Menu';
import { OtpField } from '../components/ui/OtpField';
import { PasswordField } from '../components/ui/PasswordField';
import { ScoreBruto } from '../components/ui/ScoreBruto';
import { ScrollFade } from '../components/ui/ScrollFade';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { Tabs } from '../components/ui/Tabs';
import { TextField } from '../components/ui/TextField';
import { notificar } from '../components/ui/Toast';
import css from './Componentes.module.css';

const EMOCOES: Emocao[] = ['feliz', 'triste', 'ansioso', 'calmo', 'irritado', 'cansado'];
const VARIANTES = ['filled', 'tonal', 'outlined', 'text'] as const;
const OPCOES_SELECT = [
  { id: 'a', rotulo: 'Opção A' },
  { id: 'b', rotulo: 'Opção B' },
  { id: 'c', rotulo: 'Opção C' },
];
const OPCOES_SEGMENTO = [
  { id: 'a', rotulo: 'Login' },
  { id: 'b', rotulo: 'Cadastro' },
];
const ITENS_MENU = [
  { id: 'um', rotulo: 'Primeira ação' },
  { id: 'dois', rotulo: 'Segunda ação' },
];
const REGISTROS = Array.from({ length: 12 }, (_, i) => `Registro ${i + 1}`);

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={css.secao}>
      <h2 className={css.tituloSecao}>{titulo}</h2>
      {children}
    </section>
  );
}

export default function Componentes() {
  const [segmento, setSegmento] = useState('a');
  const [select, setSelect] = useState<string | null>('a');
  const [codigo, setCodigo] = useState('');
  const [codigoCompleto, setCodigoCompleto] = useState('123456');
  const [periodo, setPeriodo] = useState<Periodo | null>({
    start: today(getLocalTimeZone()).subtract({ days: 6 }),
    end: today(getLocalTimeZone()),
  });
  const [filtro, setFiltro] = useState(true);
  const [dialogo, setDialogo] = useState(false);
  const [acaoMenu, setAcaoMenu] = useState('nenhuma');

  return (
    <Shell psicologo={{ nome: 'Nome Exemplo' }}>
      <div className={css.pagina}>
        <h1 className={css.titulo}>Componentes</h1>
        <p className={css.nota}>Tela de desenvolvimento: cada componente nos seus estados, sem servidor.</p>

        <Secao titulo="Botões">
          <div className={css.linha}>
            {VARIANTES.map((variante) => (
              <Button key={variante} variante={variante}>
                {variante}
              </Button>
            ))}
          </div>
          <div className={css.linha}>
            {VARIANTES.map((variante) => (
              <Button key={variante} variante={variante} isDisabled>
                desabilitado
              </Button>
            ))}
          </div>
          <div className={css.linha}>
            <Button icone={<Plus />}>Com ícone</Button>
            <Button isPending>Salvando</Button>
            <Button variante="outlined" isPending>
              Carregando
            </Button>
            <IconButton aria-label="Configurações" icone={<Settings />} />
            <IconButton aria-label="Tema (desabilitado)" icone={<Palette />} isDisabled />
          </div>
        </Secao>

        <Secao titulo="Campos">
          <div className={css.grade}>
            <TextField rotulo="E-mail" type="email" autoComplete="email" descricao="Usado para entrar." />
            <TextField rotulo="Nome" defaultValue="Valor preenchido" />
            <TextField rotulo="CRP" erro="Informe o CRP no formato 00/00000." defaultValue="12" />
            <TextField rotulo="Campo desabilitado" isDisabled defaultValue="Indisponível" />
            <PasswordField rotulo="Senha" autoComplete="current-password" />
            <PasswordField rotulo="Senha com erro" erro="A senha precisa de ao menos 8 caracteres." defaultValue="abc" />
          </div>
          <div className={css.gradeLarga}>
            <OtpField rotulo="Código de verificação" valor={codigo} onChange={setCodigo} />
            <OtpField rotulo="Código preenchido" valor={codigoCompleto} onChange={setCodigoCompleto} />
            <OtpField rotulo="Código incorreto" valor="123456" onChange={() => undefined} erro="O código não confere." />
            <OtpField rotulo="Código desabilitado" valor="12" onChange={() => undefined} isDisabled />
          </div>
          <div className={css.grade}>
            <Select rotulo="Seleção" opcoes={OPCOES_SELECT} valor={select} onChange={setSelect} />
            <Select rotulo="Seleção sem valor" opcoes={OPCOES_SELECT} valor={null} onChange={setSelect} placeholder="Escolha uma opção" />
            <Select rotulo="Seleção com erro" opcoes={OPCOES_SELECT} valor={null} onChange={setSelect} erro="Escolha uma opção." />
            <Select rotulo="Seleção desabilitada" opcoes={OPCOES_SELECT} valor="b" onChange={setSelect} isDisabled />
          </div>
          <SegmentedControl aria-label="Modo de acesso" opcoes={OPCOES_SEGMENTO} valor={segmento} onChange={setSegmento} />
        </Secao>

        <Secao titulo="Cartões, listas e chips">
          <div className={css.grade}>
            <Card>
              <h3 className={css.tituloCartao}>Cartão</h3>
              <p>Superfície elevada por tom, sem sombra.</p>
            </Card>
            <Card>
              <ul>
                <ListItem titulo="Item estático" apoio="Texto de apoio" />
                <ListItem titulo="Item com ação" apoio="Aciona um botão" icone={<Users />} onPress={() => notificar({ titulo: 'Item acionado' })} />
                <ListItem titulo="Item com link" apoio="Navega para o início" href="/inicio" fim={<Chip emocao="calmo">Calmo</Chip>} />
              </ul>
            </Card>
            <Card>
              <ScrollFade aria-label="Lista de registros">
                <ul>
                  {REGISTROS.map((registro) => (
                    <ListItem key={registro} titulo={registro} apoio="Data e hora" />
                  ))}
                </ul>
              </ScrollFade>
            </Card>
          </div>
          <div className={css.linha}>
            {EMOCOES.map((emocao) => (
              <Chip key={emocao} emocao={emocao}>
                {emocao.charAt(0).toUpperCase() + emocao.slice(1)}
              </Chip>
            ))}
          </div>
          <div className={css.linha}>
            <ChipFiltro isSelected={filtro} onChange={setFiltro}>
              Filtro
            </ChipFiltro>
            <ChipFiltro isSelected={false} onChange={() => undefined}>
              Sem seleção
            </ChipFiltro>
            <ChipFiltro isSelected={false} isDisabled onChange={() => undefined}>
              Desabilitado
            </ChipFiltro>
          </div>
          <div className={css.linha} aria-label="Rampa de dados, do menor ao maior">
            {[css.d1, css.d2, css.d3, css.d4, css.d5].map((classe, i) => (
              <span key={classe} className={`${css.amostra} ${classe}`} role="img" aria-label={`Passo ${i + 1} da rampa`} />
            ))}
          </div>
        </Secao>

        <Secao titulo="Navegação e sobreposições">
          <div className={css.linha}>
            <Menu
              aria-label="Menu de exemplo"
              itens={ITENS_MENU}
              onAction={setAcaoMenu}
              gatilho={<Button variante="tonal">Abrir ações</Button>}
            />
            <span className={css.nota}>Última ação: {acaoMenu}</span>
            <Button variante="outlined" onPress={() => setDialogo(true)}>
              Abrir diálogo
            </Button>
            <Button variante="text" onPress={() => notificar({ titulo: 'Preferências salvas', descricao: 'A alteração vale neste navegador.' })}>
              Notificação
            </Button>
            <Button variante="text" onPress={() => notificar({ titulo: 'Não foi possível salvar', descricao: 'Tente de novo em instantes.', tipo: 'erro' })}>
              Notificação de erro
            </Button>
          </div>
          <Tabs
            aria-label="Abas de exemplo"
            abas={[
              { id: 'um', rotulo: 'Visão geral', painel: <p>Conteúdo da primeira aba.</p> },
              { id: 'dois', rotulo: 'Linha do tempo', painel: <p>Conteúdo da segunda aba.</p> },
              { id: 'tres', rotulo: 'Escalas', painel: <p>Conteúdo da terceira aba.</p> },
              { id: 'quatro', rotulo: 'Consultas', painel: <p>Conteúdo da quarta aba.</p> },
              { id: 'cinco', rotulo: 'Anotações privadas', painel: <p>Conteúdo da quinta aba.</p> },
            ]}
          />
        </Secao>

        <Secao titulo="Datas">
          <DateRangePicker valor={periodo} onChange={setPeriodo} />
          <Calendar aria-label="Calendário de exemplo" />
        </Secao>

        <Secao titulo="Estados e avisos">
          <div className={css.grade}>
            <Card>
              <EmptyState icone={<Users />} titulo="Nenhum registro no período" descricao="Quando houver registros, eles aparecem aqui." />
            </Card>
            <Card aria-busy>
              <div className={css.esqueletos}>
                <Skeleton forma="titulo" />
                <Skeleton />
                <Skeleton />
                <Skeleton forma="bloco" />
              </div>
            </Card>
            <Card>
              <ScoreBruto valor={12} maximo={27} />
            </Card>
          </div>
          <ConsentimentoAusente />
          <Disclaimer />
        </Secao>
      </div>

      <Dialog
        titulo="Título do diálogo"
        isOpen={dialogo}
        onOpenChange={setDialogo}
        acoes={
          <>
            <Button variante="text" onPress={() => setDialogo(false)}>
              Cancelar
            </Button>
            <Button onPress={() => setDialogo(false)}>Confirmar</Button>
          </>
        }
      >
        Texto do diálogo. Esc, o fundo e os botões fecham.
      </Dialog>
    </Shell>
  );
}
