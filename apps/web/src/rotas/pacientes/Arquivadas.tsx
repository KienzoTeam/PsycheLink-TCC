import { useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { Archive, Lock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { EstadoErro } from '../../components/ui/EstadoErro';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatarDataHora } from '../../lib/formatar';
import { listarArquivadas } from '../../lib/psicologoApi';
import pagina from '../Pagina.module.css';
import css from './Anotacoes.module.css';

// Anotações de pacientes com vínculo encerrado ou conta excluída: só leitura, guardadas 5 anos (CFP).
export default function Arquivadas() {
  const consulta = useQuery({ queryKey: ['anotacoes-arquivadas'], queryFn: listarArquivadas });

  return (
    <section className={pagina.tela} aria-labelledby="titulo-tela">
      <h1 id="titulo-tela" className={pagina.titulo}>
        Anotações arquivadas
      </h1>
      <p className={css.aviso}>
        <Lock aria-hidden />
        De pacientes sem vínculo ativo. Só leitura, visíveis só para você, guardadas por 5 anos. Cada abertura fica na auditoria.
      </p>

      {consulta.isPending ? (
        <div role="status" className={pagina.esqueleto}>
          <VisuallyHidden>Carregando anotações arquivadas</VisuallyHidden>
          <Skeleton forma="bloco" />
        </div>
      ) : consulta.isError ? (
        <EstadoErro erro={consulta.error} onTentar={() => void consulta.refetch()} titulo="Não foi possível carregar as anotações" />
      ) : consulta.data.length === 0 ? (
        <EmptyState icone={<Archive aria-hidden />} titulo="Nenhuma anotação arquivada" descricao="Quando um vínculo terminar, as anotações daquele paciente aparecem aqui." />
      ) : (
        consulta.data.map((grupo, i) => (
          <section key={grupo.pacienteId ?? `excluida-${i}`} className={pagina.secao} aria-labelledby={`grupo-${i}`}>
            <h2 id={`grupo-${i}`} className={pagina.tituloSecao}>
              {grupo.nome ?? 'Paciente que excluiu a conta'}
            </h2>
            {grupo.encerradoEm && <p className={pagina.subtituloSecao}>Vínculo encerrado em {new Date(grupo.encerradoEm).toLocaleDateString('pt-BR')}</p>}
            <ul className={css.lista}>
              {grupo.anotacoes.map((anotacao) => (
                <li key={anotacao.id}>
                  <Card>
                    <p className={css.data}>{formatarDataHora(anotacao.criadoEm)}</p>
                    <p className={css.texto}>{anotacao.conteudo}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
