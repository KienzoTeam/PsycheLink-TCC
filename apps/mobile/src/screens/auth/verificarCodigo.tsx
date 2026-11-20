import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, TextInputInstance } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import CustomButton from '../../components/ui/CustomButton';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'VerificarCodigo'>;

export default function VerificarCodigo({ navigation, route }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { email, modo } = route.params;
  const { confirmarEmail, confirmarCodigoRedefinicao, confirmarLogin, reenviarCodigo, reenviarCodigoLogin } = useAuth();
  const [confiar, setConfiar] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [enviando, setEnviando] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(TextInputInstance | null)[]>([]);

  // Contagem regressiva do reenvio (o servidor também impõe cooldown de 60 s).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (text: string, index: number) => {
    const digitos = text.replace(/\D/g, '');

    if (!digitos) {
      const novo = [...code];
      novo[index] = '';
      setCode(novo);
      return;
    }

    // Colagem (ou digitação rápida): distribui os dígitos a partir do campo atual.
    if (digitos.length > 1) {
      const novo = [...code];
      let i = index;
      for (const d of digitos) {
        if (i > 5) break;
        novo[i] = d;
        i++;
      }
      setCode(novo);
      inputs.current[Math.min(i - 1, 5)]?.focus();
      return;
    }

    const novo = [...code];
    novo[index] = digitos;
    setCode(novo);
    if (index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  // Backspace em campo vazio volta um dígito e apaga o anterior junto.
  const handleTecla = (index: number) => ({ nativeEvent }: any) => {
    if (nativeEvent.key !== 'Backspace' || code[index]) return;
    if (index === 0) return;

    inputs.current[index - 1]?.focus();
    const novo = [...code];
    novo[index - 1] = '';
    setCode(novo);
  };

  const limpar = () => {
    setCode(['', '', '', '', '', '']);
    inputs.current[0]?.focus();
  };

  const handleVerificar = async () => {
    const completo = code.join('');
    if (completo.length < 6 || enviando) {
      return;
    }

    setEnviando(true);

    // 2FA do login: com o token salvo, o AppNavigator troca para o app sozinho.
    if (route.params.modo === 'login') {
      const resultado = await confirmarLogin(route.params.desafioId, completo, confiar);
      setEnviando(false);
      if (resultado === 'expirado') return navigation.goBack();
      if (resultado === 'erro') limpar();
      return;
    }

    if (modo === 'cadastro') {
      const ok = await confirmarEmail(email, completo);
      setEnviando(false);
      if (!ok) return limpar();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    // Recuperação: o código vira um token curto que autoriza a troca de senha.
    const token = await confirmarCodigoRedefinicao(email, completo);
    setEnviando(false);
    if (!token) return limpar();
    navigation.navigate('NovaSenha', { token });
  };

  const handleReenviar = async () => {
    if (cooldown > 0) return;
    // Trava já no toque: esperar a resposta deixava um segundo toque reenviar.
    setCooldown(60);
    if (route.params.modo === 'login') {
      const resultado = await reenviarCodigoLogin(route.params.desafioId);
      if (resultado === 'expirado') return navigation.goBack();
      if (resultado === 'erro') setCooldown(0);
      return;
    }
    const ok = await reenviarCodigo(email);
    if (!ok) setCooldown(0);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Text style={[styles.backText, { color: theme.colors.primary }]}>{'< Voltar'}</Text>
      </TouchableOpacity>

      {/* As etapas são do cadastro e da recuperação; o login tem uma só. */}
      {modo !== 'login' && (
        <View style={styles.stepsContainer}>
          <View style={[styles.stepDot, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.stepDotActive, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.stepDot, { backgroundColor: theme.colors.outline }]} />
        </View>
      )}

      <Text style={[styles.title, { color: theme.colors.onBackground }]}>
        {modo === 'login' ? 'Código de acesso' : 'Verifique seu e-mail'}
      </Text>

      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Enviamos um código de 6 dígitos para{'\n'}
        <Text style={[styles.emailHighlight, { color: theme.colors.onBackground }]}>{email}</Text>
      </Text>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => { inputs.current[index] = ref; }}
            style={[
              styles.codeInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: digit ? theme.colors.primary : theme.colors.outline,
                color: theme.colors.onSurface
              },
              digit ? styles.codeInputActive : null
            ]}
            keyboardType="number-pad"
            autoComplete={index === 0 ? 'sms-otp' : 'off'}
            value={digit}
            onChangeText={text => handleChange(text, index)}
            onKeyPress={handleTecla(index)}
            accessibilityLabel={`Dígito ${index + 1} de 6`}
            maxFontSizeMultiplier={1.3}
          />
        ))}
      </View>

      {modo === 'login' && (
        <View style={estilos.confiar}>
          <Text
            style={[estilos.confiarTexto, { color: theme.colors.onSurface }]}
            onPress={() => setConfiar((atual) => !atual)}
            maxFontSizeMultiplier={1.4}
          >
            Confiar neste celular por 30 dias
          </Text>
          <Switch
            value={confiar}
            onValueChange={setConfiar}
            accessibilityLabel="Confiar neste celular por 30 dias"
            accessibilityHint="Nos próximos logins, só a senha será pedida"
            trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
            thumbColor={confiar ? theme.colors.onPrimary : theme.colors.outline}
            ios_backgroundColor={theme.colors.surfaceVariant}
          />
        </View>
      )}

      <CustomButton
        title={enviando ? 'Verificando...' : 'Verificar código'}
        onPress={handleVerificar}
        loading={enviando}
      />

      <View style={styles.resendContainer}>
        <Text style={[styles.resendText, { color: theme.colors.onSurfaceVariant }]}>Não recebeu?</Text>
        <TouchableOpacity
          onPress={handleReenviar}
          disabled={cooldown > 0}
          hitSlop={{ top: 8, bottom: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Reenviar código"
        >
          {cooldown > 0 ? (
            <Text style={[styles.resendLink, { color: theme.colors.onSurfaceVariant }]}>
              Reenviar em {cooldown}s
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="refresh-cw" size={14} color={theme.colors.primary} />
              <Text style={[styles.resendLink, { color: theme.colors.primary }]}>Reenviar código</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  confiar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    minHeight: 48,
    marginBottom: 16,
  },
  confiarTexto: { flex: 1, fontSize: 16 },
});
