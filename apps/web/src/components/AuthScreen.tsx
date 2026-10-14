import {
  useState,
  type CSSProperties,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import { codigoDeErro, mensagemDeErro } from '../lib/erros';
import { iniciarSessao } from '../lib/sessao';
import { brand } from '../theme';
import { VerificarEmailModal } from './VerificarEmailModal';

type Modo = 'login' | 'cadastro';

const inputStyle: CSSProperties = {
  padding: '14px 16px',
  fontSize: 16,
  borderRadius: brand.radius.md,
  border: `1px solid ${brand.outline}`,
  background: '#fff',
  color: brand.text,
};

function Campo({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 16 }}>
      {label}
      <input style={inputStyle} {...props} />
    </label>
  );
}

// Bloco de campos que aparece só no cadastro (transição suave, sem perder o layout).
function TrechoCadastro({ aberto, children }: { aberto: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: aberto ? '1fr' : '0fr',
        transition: 'grid-template-rows 280ms ease',
      }}
    >
      <div
        style={{
          overflow: 'hidden',
          display: 'grid',
          gap: 16,
          alignContent: 'start',
          visibility: aberto ? 'visible' : 'hidden',
          filter: aberto ? 'blur(0)' : 'blur(8px)',
          transition: 'filter 280ms ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function AuthScreen() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>('login');
  const cadastro = modo === 'cadastro';

  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [crp, setCrp] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');

  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [verificandoEmail, setVerificandoEmail] = useState<string | null>(null);

  function trocarModo(novo: Modo) {
    setModo(novo);
    setErro(null);
    setAviso(null);
  }

  async function entrar() {
    const emailLimpo = email.trim();
    try {
      const { data } = await api.post<{ token: string }>('/auth/login-psicologo', {
        email: emailLimpo,
        password: senha,
      });
      iniciarSessao(data.token);
      navigate('/inicio', { replace: true });
    } catch (erroReq) {
      if (codigoDeErro(erroReq) === 'EMAIL_NAO_VERIFICADO') {
        // Reenvia o código (ignora cooldown); o modal permite digitar o código recebido.
        await api.post('/auth/reenviar-codigo', { email: emailLimpo }).catch(() => undefined);
        setVerificandoEmail(emailLimpo);
        return;
      }
      setErro(mensagemDeErro(erroReq, 'Não foi possível entrar.'));
    }
  }

  async function cadastrar() {
    if (nome.trim().length < 2) return setErro('Informe seu nome completo.');
    if (!dataNascimento) return setErro('Informe sua data de nascimento.');
    if (!/^\d{2}\/\d{5,6}$/.test(crp.replace(/\s+/g, ''))) {
      return setErro('CRP inválido. Use o formato 00/000000.');
    }
    if (senha.length < 8) return setErro('A senha deve ter no mínimo 8 caracteres.');
    if (senha !== confirmacao) return setErro('As senhas não coincidem.');

    try {
      await api.post('/auth/registro-psicologo', {
        nome: nome.trim(),
        email: email.trim(),
        password: senha,
        dataNascimento,
        crp: crp.trim(),
        especialidade: especialidade.trim() || undefined,
      });
      setVerificandoEmail(email.trim());
    } catch (erroReq) {
      setErro(mensagemDeErro(erroReq, 'Não foi possível concluir o cadastro.'));
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      await (cadastro ? cadastrar() : entrar());
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-split" style={{ minHeight: '100vh', display: 'flex', background: brand.surface }}>
      <div
        className="auth-brand"
        style={{
          flex: 1,
          padding: 32,
          display: 'grid',
          placeContent: 'center',
          justifyItems: 'center',
          gap: 8,
          background: `linear-gradient(135deg, ${brand.gradient[0]}, ${brand.gradient[1]})`,
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <strong style={{ fontSize: 28 }}>PsycheLink</strong>
        <span style={{ opacity: 0.85 }}>Acompanhamento psicológico contínuo</span>
        <span style={{ opacity: 0.7, fontSize: 13, marginTop: 8 }}>Área exclusiva para psicólogos</span>
      </div>

      <div className="auth-formwrap" style={{ flex: 1.2, display: 'grid', placeItems: 'center', padding: 48, background: brand.background }}>
        <form onSubmit={enviar} style={{ width: 'min(460px, 100%)', display: 'grid', gap: 20, alignContent: 'start' }}>
          <div style={{ position: 'relative', display: 'flex', background: '#e6e9ef', borderRadius: brand.radius.full, padding: 4 }}>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 4, bottom: 4, left: 4, width: 'calc(50% - 4px)',
                borderRadius: brand.radius.full,
                background: brand.primary,
                transform: cadastro ? 'translateX(100%)' : 'translateX(0)',
                transition: 'transform 200ms ease',
              }}
            />
            {(['login', 'cadastro'] as Modo[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => trocarModo(m)}
                style={{
                  position: 'relative', flex: 1, border: 0, background: 'transparent',
                  color: (m === 'cadastro') === cadastro ? '#fff' : brand.text,
                  padding: '12px 0', borderRadius: brand.radius.full, zIndex: 1, fontSize: 16,
                }}
              >
                {m === 'login' ? 'Login' : 'Cadastro'}
              </button>
            ))}
          </div>

          <TrechoCadastro aberto={cadastro}>
            <Campo label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required={cadastro} disabled={!cadastro} />
            <Campo label="Data de nascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} required={cadastro} disabled={!cadastro} />
            <Campo label="CRP (ex: 06/123456)" value={crp} onChange={(e) => setCrp(e.target.value)} required={cadastro} disabled={!cadastro} />
            <Campo label="Especialidade (opcional)" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} disabled={!cadastro} />
          </TrechoCadastro>

          <div style={{ display: 'grid', gap: 20 }}>
            <Campo label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <Campo label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete={cadastro ? 'new-password' : 'current-password'} />
          </div>

          <TrechoCadastro aberto={cadastro}>
            <Campo label="Confirmar senha" type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required={cadastro} disabled={!cadastro} autoComplete="new-password" />
          </TrechoCadastro>

          {erro && <p role="alert" style={{ margin: 0, color: '#d20f39', fontSize: 14 }}>{erro}</p>}
          {aviso && <p role="status" style={{ margin: 0, color: '#40a02b', fontSize: 14 }}>{aviso}</p>}

          <button
            type="submit"
            disabled={enviando}
            style={{ padding: 16, fontSize: 16, borderRadius: brand.radius.md, border: `1px solid ${brand.outline}`, background: brand.surface, color: brand.text, opacity: enviando ? 0.6 : 1 }}
          >
            {cadastro ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>
      </div>

      {verificandoEmail !== null && (
        <VerificarEmailModal
          email={verificandoEmail}
          onFechar={() => setVerificandoEmail(null)}
          onConfirmado={() => {
            setVerificandoEmail(null);
            setSenha('');
            setConfirmacao('');
            setModo('login');
            setAviso('E-mail confirmado. Faça login para continuar.');
          }}
        />
      )}
    </div>
  );
}
