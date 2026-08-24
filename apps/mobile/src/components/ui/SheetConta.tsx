import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, BackHandler } from 'react-native';
import { Feather } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import ToqueAnimado from './ToqueAnimado';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeMode } from '../../theme/ThemeContext';
import { carregarHapticos, definirHapticos, vibrarLeve } from '../../lib/hapticos';

interface Props {
  visivel: boolean;
  aoFechar: () => void;
  nome: string;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  onSair: () => void;
}

const MODOS: { valor: ThemeMode; rotulo: string }[] = [
  { valor: 'system', rotulo: 'Sistema' },
  { valor: 'light', rotulo: 'Claro' },
  { valor: 'dark', rotulo: 'Escuro' },
];

/**
 * Bottom sheet de conta e aparência (@gorhom/bottom-sheet).
 * Arraste em qualquer ponto do sheet ou toque no dim para fechar.
 */
export default function SheetConta({ visivel, aoFechar, nome, mode, setMode, onSair }: Props) {
  const { theme } = useTheme();
  const [hapticosAtivos, setHapticosAtivos] = useState(true);

  // Restaura a preferência de vibração ao abrir o sheet.
  useEffect(() => {
    if (visivel) void carregarHapticos().then(setHapticosAtivos);
  }, [visivel]);

  const alternarHapticos = async (valor: boolean) => {
    setHapticosAtivos(valor);
    await definirHapticos(valor);
    if (valor) vibrarLeve(); // Confirmação imediata ao ligar.
  };

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  if (!visivel) return null;

  return (
    // Voltar no Android fecha o sheet em vez de navegar para trás.
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <BackHandlerBridge onBack={aoFechar} />
      <BottomSheet
      enableDynamicSizing
      enableOverDrag={false}
      onClose={aoFechar}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: theme.colors.outline }}
      handleStyle={styles.handle}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
    >
      <BottomSheetView style={styles.conteudo}>
        <Text style={[styles.titulo, { color: theme.colors.onBackground }]}>{nome}</Text>

        <Text
          style={[styles.secao, { color: theme.colors.onSurfaceVariant }]}
          accessibilityRole="header"
        >
          Aparência
        </Text>
        <View style={styles.grupo}>
          {MODOS.map(({ valor, rotulo }) => {
            const ativo = mode === valor;
            return (
              <ToqueAnimado
                key={valor}
                style={[
                  styles.opcao,
                  { borderColor: ativo ? theme.colors.primary : theme.colors.outline },
                  ativo && { backgroundColor: theme.colors.primaryContainer },
                ]}
                onPress={() => {
                  setMode(valor);
                  vibrarLeve();
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: ativo }}
              >
                <Feather
                  name={ativo ? 'check-circle' : 'circle'}
                  size={18}
                  color={ativo ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.opcaoTexto, { color: theme.colors.onSurface }]} maxFontSizeMultiplier={1.4}>
                  {rotulo}
                  {ativo && ' (atual)'}
                </Text>
              </ToqueAnimado>
            );
          })}
        </View>

        <Text
          style={[styles.secao, { color: theme.colors.onSurfaceVariant }]}
          accessibilityRole="header"
        >
          Preferências
        </Text>
        <View style={[styles.preferencia, { borderColor: theme.colors.outline }]}>
          <View style={styles.preferenciaTexto}>
            <Text style={[styles.opcaoTexto, { color: theme.colors.onSurface }]} maxFontSizeMultiplier={1.4}>
              Vibração ao tocar
            </Text>
            <Text style={[styles.preferenciaDescricao, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>
              Resposta tátil nas seleções do app
            </Text>
          </View>
          <Switch
            value={hapticosAtivos}
            onValueChange={(valor) => void alternarHapticos(valor)}
            trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
            ios_backgroundColor={theme.colors.surfaceVariant}
            accessibilityLabel="Vibração ao tocar"
          />
        </View>

        <ToqueAnimado
          style={[styles.sair, { borderColor: theme.colors.error }]}
          onPress={onSair}
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
        >
          <Feather name="log-out" size={18} color={theme.colors.error} />
          <Text style={[styles.sairTexto, { color: theme.colors.error }]} maxFontSizeMultiplier={1.4}>Sair da conta</Text>
        </ToqueAnimado>
      </BottomSheetView>
    </BottomSheet>
    </View>
  );
}

/** Fecha o sheet no botão voltar do Android enquanto estiver aberto. */
function BackHandlerBridge({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);
  return null;
}

const styles = StyleSheet.create({
  conteudo: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  handle: {
    paddingTop: 8,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  secao: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  grupo: {
    gap: 8,
    marginBottom: 24,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  opcaoTexto: {
    fontSize: 15,
    fontWeight: '500',
  },
  preferencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  preferenciaTexto: {
    flex: 1,
    gap: 2,
  },
  preferenciaDescricao: {
    fontSize: 12,
  },
  sair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  sairTexto: {
    fontSize: 15,
    fontWeight: '700',
  },
});
