import { useState } from 'react';
import { Navigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useCompacto } from '../lib/useCompacto';
import { buscarMe } from '../lib/psicologoApi';
import { FormularioAcesso } from './auth/FormularioAcesso';
import { RecuperarSenha } from './auth/RecuperarSenha';
// Fontes da identidade (só nesta tela): Cormorant Garamond no nome, Outfit no slogan.
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/outfit/latin-400.css';
import css from './Auth.module.css';

export function Auth() {
  const compacto = useCompacto();
  const [recuperando, setRecuperando] = useState(false);
  const [trocou, setTrocou] = useState(false);
  // O e-mail digitado acompanha o usuário entre o login e a recuperação.
  const [email, setEmail] = useState('');
  const me = useQuery({ queryKey: ['psicologo', 'me'], queryFn: buscarMe, retry: false });

  if (me.isSuccess) return <Navigate to="/inicio" replace />;

  const trocarTela = (recuperar: boolean) => (novoEmail: string) => {
    setEmail(novoEmail);
    setRecuperando(recuperar);
    setTrocou(true);
  };

  return (
    <div className={css.pagina} data-compacto={compacto}>
      <header className={css.marca}>
        <div className={css.marcaConteudo}>
          <img src="/logo-arvore.svg" alt="" className={css.logo} />
          <div className={css.textos}>
            <h1 className={css.nome}>PsycheLink</h1>
            <p className={css.slogan}>O acompanhamento entre as sessões.</p>
          </div>
        </div>
      </header>
      <main className={css.painel}>
        <div key={recuperando ? 'recuperar' : 'acesso'} className={css.coluna} data-trocou={trocou}>
          {recuperando ? (
            <RecuperarSenha email={email} aoVoltar={trocarTela(false)} />
          ) : (
            <FormularioAcesso email={email} aoRecuperarSenha={trocarTela(true)} />
          )}
        </div>
      </main>
    </div>
  );
}
