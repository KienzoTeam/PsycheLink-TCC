import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import CustomButton from '../../components/ui/CustomButton';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'VerificarCodigo'>;

export default function VerificarCodigo({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { email, modo } = route.params;
  const { confirmarEmail, confirmarCodigoRedefinicao, reenviarCodigo } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [enviando, setEnviando] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(TextInput | null)[]>([]);

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

    if (modo === 'cadastro') {
      const ok = await confirmarEmail(email, completo);
      setEnviando(false);
      if (!ok) return limpar();
      navigation.navigate('Login');
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
    const ok = await reenviarCodigo(email);
    if (ok) setCooldown(60);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, { color: theme.colors.primary }]}>{'< Voltar'}</Text>
      </TouchableOpacity>

      <View style={styles.stepsContainer}>
        <View style={[styles.stepDot, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.stepDotActive, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.stepDot, { backgroundColor: theme.colors.outline }]} />
      </View>

      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Verifique seu e-mail</Text>

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
          />
        ))}
      </View>

      <CustomButton
        title={enviando ? 'Verificando...' : 'Verificar código'}
        onPress={handleVerificar}
        loading={enviando}
      />

      <View style={styles.resendContainer}>
        <Text style={[styles.resendText, { color: theme.colors.onSurfaceVariant }]}>Não recebeu?</Text>
        <TouchableOpacity onPress={handleReenviar} disabled={cooldown > 0}>
          <Text style={[
            styles.resendLink,
            { color: cooldown > 0 ? theme.colors.onSurfaceVariant : theme.colors.primary }
          ]}>
            {cooldown > 0 ? `Reenviar em ${cooldown}s` : '🔄 Reenviar código'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
