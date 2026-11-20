import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { vibrarLeve } from '../../lib/hapticos';

// Grounding 5-4-3-2-1: traz a atenção para o presente pelos sentidos. Local, sem servidor.
const PASSOS: { n: number; icone: React.ComponentProps<typeof Feather>['name']; texto: string }[] = [
  { n: 5, icone: 'eye', texto: 'Olhe em volta e diga 5 coisas que você está vendo.' },
  { n: 4, icone: 'feather', texto: 'Perceba 4 coisas que você pode tocar: a roupa, o chão, a cadeira.' },
  { n: 3, icone: 'headphones', texto: 'Escute com calma e encontre 3 sons ao seu redor.' },
  { n: 2, icone: 'wind', texto: 'Note 2 cheiros, ou lembre de 2 cheiros de que você gosta.' },
  { n: 1, icone: 'coffee', texto: 'Perceba 1 gosto na boca, ou beba um gole de água.' },
];

export default function ExercicioGrounding({ visivel, aoFechar }: { visivel: boolean; aoFechar: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [passo, setPasso] = useState(0);

  useEffect(() => {
    if (visivel) setPasso(0);
  }, [visivel]);

  const fim = passo === PASSOS.length;
  const atual = PASSOS[Math.min(passo, PASSOS.length - 1)];

  return (
    <Modal visible={visivel} animationType="fade" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={[estilos.tela, { backgroundColor: theme.colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={estilos.fechar} onPress={aoFechar} accessibilityRole="button" accessibilityLabel="Fechar exercício">
          <Feather name="x" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>

        <View style={estilos.centro} accessibilityLiveRegion="polite">
          {fim ? (
            <>
              <Feather name="check-circle" size={56} color={theme.colors.primary} />
              <Text style={[estilos.titulo, { color: theme.colors.onBackground }]}>Você voltou para o agora.</Text>
              <Text style={[estilos.texto, { color: theme.colors.onSurfaceVariant }]}>
                Se ainda estiver difícil, ligue para o CVV no 188 ou fale com alguém de confiança.
              </Text>
            </>
          ) : (
            <>
              <View style={[estilos.numero, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text style={[estilos.numeroTexto, { color: theme.colors.onPrimaryContainer }]}>{atual.n}</Text>
              </View>
              <Feather name={atual.icone} size={28} color={theme.colors.primary} />
              <Text style={[estilos.titulo, { color: theme.colors.onBackground }]} accessibilityRole="header">
                {atual.texto}
              </Text>
              <Text style={[estilos.texto, { color: theme.colors.onSurfaceVariant }]}>
                Sem pressa. Pode falar em voz alta ou só pensar.
              </Text>
            </>
          )}
        </View>

        <View style={estilos.botoes}>
          {!fim && passo > 0 && (
            <TouchableOpacity
              style={[estilos.botao, { borderWidth: 1, borderColor: theme.colors.outline }]}
              onPress={() => setPasso(passo - 1)}
              accessibilityRole="button"
            >
              <Text style={[estilos.botaoTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[estilos.botao, estilos.principal, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              vibrarLeve();
              if (fim) aoFechar();
              else setPasso(passo + 1);
            }}
            accessibilityRole="button"
          >
            <Text style={[estilos.botaoTexto, { color: theme.colors.onPrimary }]}>{fim ? 'Concluir' : 'Próximo'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, paddingHorizontal: 24 },
  fechar: { alignSelf: 'flex-end', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  numero: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { fontSize: 48, fontWeight: '700' },
  titulo: { fontSize: 22, lineHeight: 30, fontWeight: '600', textAlign: 'center' },
  texto: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  botoes: { flexDirection: 'row', gap: 12 },
  botao: { flex: 1, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  principal: { flex: 2 },
  botaoTexto: { fontSize: 16, fontWeight: '600' },
});
