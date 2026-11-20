import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeContext';
import { styles as telaStyles } from '../../screens/paciente/BemEstar/StyleBemEstar';
import { GUIDED_EXERCISES, QUICK_EXERCISES } from '../../constants/data';
import { Exercise } from '../../constants/types';
import { mensagemDeErro } from '../../lib/vinculoService';
import type { Recomendacao } from '../../lib/recomendacoesService';
import CustomButton from '../ui/CustomButton';

const EXERCICIOS = [...QUICK_EXERCISES, ...GUIDED_EXERCISES];
const FEITA_RECENTE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FEITAS = 3;
const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

interface Props {
  /** Nula até a primeira resposta (ou se ela falhou). */
  recomendacoes: Recomendacao[] | null;
  erro: boolean;
  onTentarDeNovo: () => void;
  onAbrirExercicio: (exercicio: Exercise) => void;
  onMarcarFeita: (id: number) => Promise<void>;
}

/** Fica fora da tela enquanto carrega e quando não há o que mostrar: Bem-estar vale sem ela. */
export function RecomendacoesDoPsicologo({
  recomendacoes,
  erro,
  onTentarDeNovo,
  onAbrirExercicio,
  onMarcarFeita,
}: Props) {
  const { theme } = useTheme();

  if (recomendacoes === null) {
    if (!erro) return null;
    return (
      <View style={styles.erro}>
        <Text
          style={[styles.erroTexto, { color: theme.colors.subtext1 }]}
          maxFontSizeMultiplier={1.3}
        >
          Não foi possível carregar as recomendações do seu psicólogo.
        </Text>

        <TouchableOpacity
          style={styles.tentar}
          onPress={onTentarDeNovo}
          accessibilityRole="button"
          accessibilityLabel="Tentar carregar as recomendações de novo"
        >
          <Text style={[styles.tentarTexto, { color: theme.colors.primary }]} maxFontSizeMultiplier={1.3}>
            Tentar de novo
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pendentes = recomendacoes.filter((r) => !r.feitoEm);
  const feitas = recomendacoes
    .filter((r) => r.feitoEm && Date.now() - new Date(r.feitoEm).getTime() < FEITA_RECENTE_MS)
    .sort((a, b) => new Date(b.feitoEm!).getTime() - new Date(a.feitoEm!).getTime())
    .slice(0, MAX_FEITAS);

  if (pendentes.length === 0 && feitas.length === 0) return null;

  return (
    <View style={styles.secao}>
      <View style={[telaStyles.sectionHeader, styles.cabecalho]}>
        <Feather name="user" size={20} color={theme.colors.primary} />

        <Text
          style={[telaStyles.sectionTitle, { color: theme.colors.onBackground }]}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.2}
        >
          Do seu psicólogo
        </Text>
      </View>

      <View style={styles.lista}>
        {pendentes.map((r) => (
          <CartaoPendente
            key={r.id}
            recomendacao={r}
            onAbrirExercicio={onAbrirExercicio}
            onMarcarFeita={onMarcarFeita}
          />
        ))}

        {feitas.map((r) => (
          <View
            key={r.id}
            style={styles.feita}
            accessible
            accessibilityLabel={`${r.titulo}. Feita em ${diaMes.format(new Date(r.feitoEm!))}.`}
          >
            <Feather name="check-circle" size={18} color={theme.colors.subtext1} />

            <View style={telaStyles.guidedInformation}>
              <Text
                style={[styles.feitaTitulo, { color: theme.colors.onSurfaceVariant }]}
                maxFontSizeMultiplier={1.3}
              >
                {r.titulo}
              </Text>

              <Text
                style={[styles.feitaData, { color: theme.colors.subtext1 }]}
                maxFontSizeMultiplier={1.3}
              >
                Feita em {diaMes.format(new Date(r.feitoEm!))}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

interface CartaoProps {
  recomendacao: Recomendacao;
  onAbrirExercicio: (exercicio: Exercise) => void;
  onMarcarFeita: (id: number) => Promise<void>;
}

function CartaoPendente({ recomendacao: r, onAbrirExercicio, onMarcarFeita }: CartaoProps) {
  const { theme } = useTheme();
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  // Um id que este app não conhece (catálogo mais novo que o app) vira recomendação livre.
  const exercicio = EXERCICIOS.find((e) => e.id === r.exercicioId);
  const descricao = r.descricao ?? exercicio?.description ?? null;

  async function marcar() {
    setEnviando(true);
    setFalha(null);
    try {
      await onMarcarFeita(r.id);
    } catch (e) {
      setFalha(mensagemDeErro(e, 'Não foi possível marcar como feito. Tente de novo.'));
      setEnviando(false);
    }
  }

  const topo = (
    <>
      <View style={[telaStyles.guidedIcon, { backgroundColor: theme.colors.primaryContainer }]}>
        <Feather name={exercicio?.icon ?? 'clipboard'} size={22} color={theme.colors.primary} />
      </View>

      <View style={telaStyles.guidedInformation}>
        <Text
          style={[telaStyles.guidedTitle, { color: theme.colors.onSurface }]}
          maxFontSizeMultiplier={1.3}
        >
          {r.titulo}
        </Text>

        {descricao && (
          <Text
            style={[telaStyles.guidedDescription, { color: theme.colors.onSurfaceVariant }]}
            maxFontSizeMultiplier={1.3}
          >
            {descricao}
          </Text>
        )}

        {r.nota && (
          <Text
            style={[styles.nota, { color: theme.colors.onSurface }]}
            maxFontSizeMultiplier={1.3}
          >
            <Text style={styles.notaRotulo}>Nota: </Text>
            {r.nota}
          </Text>
        )}
      </View>

      {exercicio && <Feather name="chevron-right" size={18} color={theme.colors.subtext1} />}
    </>
  );

  return (
    <View
      style={[
        styles.cartao,
        { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant },
      ]}
    >
      {exercicio ? (
        <TouchableOpacity
          style={styles.topo}
          activeOpacity={0.8}
          onPress={() => onAbrirExercicio(exercicio)}
          accessibilityRole="button"
          accessibilityLabel={[r.titulo, descricao, r.nota && `Nota: ${r.nota}`].filter(Boolean).join('. ')}
          accessibilityHint="Abre o exercício"
        >
          {topo}
        </TouchableOpacity>
      ) : (
        <View style={styles.topo}>{topo}</View>
      )}

      {falha && (
        <Text
          style={[styles.falha, { color: theme.colors.error }]}
          accessibilityRole="alert"
          maxFontSizeMultiplier={1.3}
        >
          {falha}
        </Text>
      )}

      <CustomButton
        title="Marquei como feito"
        variant="secondary"
        loading={enviando}
        onPress={() => void marcar()}
        style={styles.botao}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    marginBottom: 22,
  },
  // Primeiro item da tela: o espaço de cima já vem do paddingTop do scroll.
  cabecalho: {
    marginTop: 0,
  },
  lista: {
    gap: 11,
  },
  cartao: {
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topo: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  nota: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  notaRotulo: {
    fontWeight: '700',
  },
  falha: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  botao: {
    height: 48,
    marginTop: 12,
    marginVertical: 0,
  },
  feita: {
    minHeight: 44,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  feitaTitulo: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  feitaData: {
    fontSize: 12,
    lineHeight: 16,
  },
  erro: {
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  erroTexto: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  tentar: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  tentarTexto: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default RecomendacoesDoPsicologo;
