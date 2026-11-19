import { Component, type ReactNode } from 'react';
import { EstadoErro } from './EstadoErro';

// Erro de renderização (ou arquivo de tela que sumiu depois de um deploy) vira aviso com recarga, não tela branca.
export class LimiteErro extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false };

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  render() {
    if (!this.state.falhou) return this.props.children;
    return (
      <EstadoErro
        erro={null}
        titulo="Esta tela não abriu"
        descricao="Recarregue a página. Se o problema continuar, tente de novo em alguns minutos."
        onTentar={() => window.location.reload()}
      />
    );
  }
}
