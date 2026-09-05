import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView,} from '@gorhom/bottom-sheet';
import ToqueAnimado from './ToqueAnimado';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeMode } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { carregarHapticos,definirHapticos,vibrarLeve,} from '../../lib/hapticos';

interface Props {
  visivel: boolean;
  aoFechar: () => void;
  /** Mantido como fallback de compatibilidade */
  nome?: string;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  onSair: () => void;
  psicologoVinculado?: {
    nome: string;
  } | null;
  onGerenciarVinculo?: () => void;

  /** Callbacks para o menu de configurações */
  onConfiguracoesConta?: () => void;
  onNotificacoes?: () => void;
  onPrivacidade?: () => void;
  onAjudaSuporte?: () => void;
}

const MODOS: { valor: ThemeMode; rotulo: string }[] = [
  { valor: 'system', rotulo: 'Sistema' },
  { valor: 'light', rotulo: 'Claro' },
  { valor: 'dark', rotulo: 'Escuro' },
];

function obterIniciais(nome: string): string {
  const partesNome = nome.trim().split(/\s+/).filter(Boolean);

  if (partesNome.length === 0) return 'U';
  if (partesNome.length === 1) return partesNome[0].charAt(0).toUpperCase();

  const primeiraInicial = partesNome[0].charAt(0);
  const ultimaInicial = partesNome[partesNome.length - 1].charAt(0);

  return `${primeiraInicial}${ultimaInicial}`.toUpperCase();
}

/**
 * Bottom sheet de conta, perfil, aparências e opções de configurações.
 */
export default function SheetConta({
 visivel,aoFechar, nome = '', mode, setMode, onSair, psicologoVinculado = null, onGerenciarVinculo, onConfiguracoesConta,onNotificacoes,onPrivacidade,onAjudaSuporte,}: Props) {
  const { theme } = useTheme();
  const { usuario } = useAuth();
  const [hapticosAtivos, setHapticosAtivos] = useState(true);

  const nomeExibido = usuario?.nome?.trim() || nome?.trim() || 'Usuário';
  const emailExibido = usuario?.email?.trim() || '';
  const iniciais = obterIniciais(nomeExibido);

  useEffect(() => {
    if (visivel) {
      void carregarHapticos().then(setHapticosAtivos);
    }
  }, [visivel]);

  const alternarHapticos = async (valor: boolean) => {
    setHapticosAtivos(valor);
    await definirHapticos(valor);

    if (valor) {
      vibrarLeve();
    }
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
    [],
  );

  if (!visivel) return null;

  const opcoesMenu = [
    {
      id: 'config_conta',
      rotulo: 'Configurações da Conta',
      icone: 'settings' as const,
      acao: onConfiguracoesConta,
    },
    {
      id: 'notificacoes',
      rotulo: 'Notificações',
      icone: 'bell' as const,
      acao: onNotificacoes,
    },
    {
      id: 'privacidade',
      rotulo: 'Privacidade e Segurança',
      icone: 'shield' as const,
      acao: onPrivacidade,
    },
    {
      id: 'ajuda',
      rotulo: 'Ajuda e Suporte',
      icone: 'help-circle' as const,
      acao: onAjudaSuporte,
    },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <BackHandlerBridge onBack={aoFechar} />

      <BottomSheet
        index={0}
        snapPoints={['92%']}
        enableDynamicSizing={false}
        enableOverDrag={false}
        enablePanDownToClose
        onClose={aoFechar}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: theme.colors.outline }}
        handleStyle={styles.handle}
        backgroundStyle={{ backgroundColor: theme.colors.background }}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.conteudo}
        >
          <Text
            style={[styles.tituloPagina, { color: theme.colors.onBackground }]}
            accessibilityRole="header"
          >
            Perfil
          </Text>

        
          <View
            style={[
              styles.perfilCard,
              {
                backgroundColor: theme.colors.surfaceContainer,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <View style={styles.usuarioContainer}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.avatarTexto,
                    { color: theme.colors.onPrimary },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {iniciais}
                </Text>
              </View>

              <View style={styles.usuarioInformacoes}>
                <Text
                  style={[
                    styles.nomeUsuario,
                    { color: theme.colors.onSurface },
                  ]}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.3}
                >
                  {nomeExibido}
                </Text>

                {emailExibido ? (
                  <Text
                    style={[
                      styles.emailUsuario,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    {emailExibido}
                  </Text>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.divisor,
                { backgroundColor: theme.colors.outline },
              ]}
            />

            {/* Vínculo Profissional */}
            <ToqueAnimado
              style={[
                styles.vinculoContainer,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
              onPress={() => {
                vibrarLeve();
                onGerenciarVinculo?.();
              }}
              disabled={!onGerenciarVinculo}
              accessibilityRole="button"
              accessibilityLabel={
                psicologoVinculado
                  ? `Psicólogo vinculado: ${psicologoVinculado.nome}`
                  : 'Nenhum psicólogo vinculado'
              }
            >
              <View
                style={[
                  styles.vinculoIcone,
                  { backgroundColor: theme.colors.surfaceContainer },
                ]}
              >
                <Feather
                  name={psicologoVinculado ? 'user-check' : 'user'}
                  size={19}
                  color={theme.colors.primary}
                />
              </View>

              <View style={styles.vinculoTextos}>
                <Text
                  style={[
                    styles.vinculoTitulo,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {psicologoVinculado
                    ? 'Psicólogo vinculado'
                    : 'Vínculo profissional'}
                </Text>

                <Text
                  style={[
                    styles.vinculoNome,
                    { color: theme.colors.onPrimaryContainer },
                  ]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {psicologoVinculado?.nome || 'Nenhum psicólogo vinculado'}
                </Text>
              </View>

              {psicologoVinculado ? (
                <Feather
                  name="check-circle"
                  size={20}
                  color={theme.colors.tertiary}
                />
              ) : onGerenciarVinculo ? (
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.colors.primary}
                />
              ) : null}
            </ToqueAnimado>
          </View>

          {/* Menu de Configurações */}
          <View
            style={[
              styles.cardMenu,
              {
                backgroundColor: theme.colors.surfaceContainer,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            {opcoesMenu.map((item, index) => {
              const ehUltimo = index === opcoesMenu.length - 1;

              return (
                <React.Fragment key={item.id}>
                  <ToqueAnimado
                    style={styles.itemMenu}
                    onPress={() => {
                      vibrarLeve();
                      item.acao?.();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.rotulo}
                  >
                    <View style={styles.itemMenuEsquerda}>
                      <Feather
                        name={item.icone}
                        size={20}
                        color={theme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.itemMenuTexto,
                          { color: theme.colors.onSurface },
                        ]}
                        maxFontSizeMultiplier={1.3}
                      >
                        {item.rotulo}
                      </Text>
                    </View>

                    <Feather
                      name="chevron-right"
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </ToqueAnimado>

                  {!ehUltimo && (
                    <View
                      style={[
                        styles.divisorMenu,
                        { backgroundColor: theme.colors.outline },
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Aparência */}
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
                    {
                      borderColor: ativo
                        ? theme.colors.primary
                        : theme.colors.outline,
                      backgroundColor: ativo
                        ? theme.colors.primaryContainer
                        : theme.colors.surfaceContainer,
                    },
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
                    color={
                      ativo
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  />

                  <Text
                    style={[
                      styles.opcaoTexto,
                      { color: theme.colors.onSurface },
                    ]}
                    maxFontSizeMultiplier={1.4}
                  >
                    {rotulo}
                    {ativo && ' (atual)'}
                  </Text>
                </ToqueAnimado>
              );
            })}
          </View>

          {/* Preferências */}
          <Text
            style={[styles.secao, { color: theme.colors.onSurfaceVariant }]}
            accessibilityRole="header"
          >
            Preferências
          </Text>

          <View
            style={[
              styles.preferencia,
              {
                backgroundColor: theme.colors.surfaceContainer,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <View style={styles.preferenciaTexto}>
              <Text
                style={[
                  styles.opcaoTexto,
                  { color: theme.colors.onSurface },
                ]}
                maxFontSizeMultiplier={1.4}
              >
                Vibração ao tocar
              </Text>

              <Text
                style={[
                  styles.preferenciaDescricao,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                maxFontSizeMultiplier={1.4}
              >
                Resposta tátil nas seleções do app
              </Text>
            </View>

            <Switch
              value={hapticosAtivos}
              onValueChange={(valor) => void alternarHapticos(valor)}
              trackColor={{
                false: theme.colors.surfaceVariant,
                true: theme.colors.primary,
              }}
              ios_backgroundColor={theme.colors.surfaceVariant}
              accessibilityLabel="Vibração ao tocar"
            />
          </View>

          {/* Logout */}
          <ToqueAnimado
            style={[
              styles.sair,
              {
                backgroundColor: theme.colors.surfaceContainer,
                borderColor: theme.colors.error,
              },
            ]}
            onPress={onSair}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
          >
            <Feather name="log-out" size={18} color={theme.colors.error} />

            <Text
              style={[styles.sairTexto, { color: theme.colors.error }]}
              maxFontSizeMultiplier={1.4}
            >
              Sair da conta
            </Text>
          </ToqueAnimado>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

/**
 * Intercepta o botão Voltar do Android para fechar o Sheet.
 */
function BackHandlerBridge({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onBack]);

  return null;
}

const styles = StyleSheet.create({
  handle: {
    paddingTop: 8,
  },
  conteudo: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  tituloPagina: {
    marginBottom: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  perfilCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 2,
  },
  usuarioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarTexto: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '500',
  },
  usuarioInformacoes: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16,
  },
  nomeUsuario: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  emailUsuario: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 17,
  },
  vinculoContainer: {
    minHeight: 65,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vinculoIcone: {
    width: 40,
    height: 40,
    marginRight: 11,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinculoTextos: {
    flex: 1,
    minWidth: 0,
  },
  vinculoTitulo: {
    marginBottom: 2,
    fontSize: 12,
    lineHeight: 17,
  },
  vinculoNome: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  cardMenu: {
    marginBottom: 24,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  itemMenuEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  itemMenuTexto: {
    fontSize: 15,
    fontWeight: '600',
  },
  divisorMenu: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },
  secao: {
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  grupo: {
    gap: 8,
    marginBottom: 24,
  },
  opcao: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  opcaoTexto: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  preferencia: {
    minHeight: 62,
    marginBottom: 24,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenciaTexto: {
    flex: 1,
    gap: 2,
  },
  preferenciaDescricao: {
    fontSize: 12,
    lineHeight: 17,
  },
  sair: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sairTexto: {
    fontSize: 15,
    fontWeight: '700',
  },
});