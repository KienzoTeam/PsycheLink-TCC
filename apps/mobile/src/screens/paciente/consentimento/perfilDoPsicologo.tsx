import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import ToqueAnimado from '../../../components/ui/ToqueAnimado';
import { acoesDoContato, type AcaoDeContato } from '../../../lib/contatoProfissional';
import { buscarPerfilDoPsicologo, type PerfilProfissional } from '../../../lib/vinculoService';
import { styles } from './styleConsentimento';

const ROTULO_MODALIDADE = { presencial: 'Presencial', online: 'Online' };

/** Perfil profissional dentro do cartão do psicólogo. Se não carregar, a tela segue só com o básico. */
export default function PerfilDoPsicologo() {
  const { theme } = useTheme();
  // null enquanto carrega; 'erro' quando a busca falha.
  const [perfil, setPerfil] = useState<PerfilProfissional | 'erro' | null>(null);

  useEffect(() => {
    buscarPerfilDoPsicologo().then(setPerfil, () => setPerfil('erro'));
  }, []);

  const abrir = async ({ url }: AcaoDeContato, contato: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não foi possível abrir', `Use o contato informado pelo seu psicólogo: ${contato}`);
    }
  };

  const campos =
    perfil && perfil !== 'erro'
      ? [
          ['Especialidade', perfil.especialidade],
          ['Abordagem', perfil.abordagem],
          ['Atendimento', perfil.modalidades.map((m) => ROTULO_MODALIDADE[m]).join(' e ')],
          ['Onde atende', perfil.atendeEm],
          ['Sobre', perfil.sobre],
        ].filter((campo): campo is [string, string] => Boolean(campo[1]))
      : [];

  const renderCampo = (rotulo: string, valor: string) => (
    <View key={rotulo} style={styles.campo} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text style={[styles.campoRotulo, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>
        {rotulo}
      </Text>
      <Text style={[styles.campoValor, { color: theme.colors.onSurface }]} maxFontSizeMultiplier={1.4}>
        {valor}
      </Text>
    </View>
  );

  const renderConteudo = () => {
    if (perfil === null) {
      return (
        <View style={styles.perfilEstado} accessibilityRole="progressbar" accessibilityLabel="Carregando o perfil profissional">
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }

    if (perfil === 'erro') {
      return (
        <Text style={[styles.campoValor, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>
          Não foi possível carregar o perfil profissional agora.
        </Text>
      );
    }

    const acoes = perfil.contato ? acoesDoContato(perfil.contato) : [];

    if (campos.length === 0 && !perfil.contato) {
      return (
        <Text style={[styles.campoValor, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>
          Seu psicólogo ainda não preencheu o perfil profissional.
        </Text>
      );
    }

    return (
      <>
        {campos.map(([rotulo, valor]) => renderCampo(rotulo, valor))}
        {perfil.contato && (
          <View style={styles.contato}>
            {renderCampo('Contato', perfil.contato)}
            {acoes.length > 0 && (
              <View style={styles.acoes}>
                {acoes.map((acao) => (
                  <ToqueAnimado
                    key={acao.chave}
                    style={[styles.acao, { borderColor: theme.colors.outline }]}
                    onPress={() => void abrir(acao, perfil.contato!)}
                    accessibilityRole="button"
                    accessibilityLabel={acao.descricao}
                  >
                    <Feather name={acao.icone} size={18} color={theme.colors.primary} />
                    <Text style={[styles.acaoTexto, { color: theme.colors.primary }]} maxFontSizeMultiplier={1.4}>
                      {acao.rotulo}
                    </Text>
                  </ToqueAnimado>
                ))}
              </View>
            )}
          </View>
        )}
      </>
    );
  };

  return <View style={[styles.perfil, { borderTopColor: theme.colors.outlineVariant }]}>{renderConteudo()}</View>;
}
