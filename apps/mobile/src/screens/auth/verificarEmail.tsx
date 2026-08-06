import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeContext';
import CustomButton from '../../components/ui/CustomButton';
import OtpCodeInput from '../../components/ui/OtpCodeInput';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'VerificarEmail'>;

export default function VerificarEmail({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { email } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [canResend, setCanResend] = useState(true);
  const resendTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { verificarEmail, reenviarVerificacaoEmail, carregando } = useAuth();

  useEffect(() => () => {
    if (resendTimer.current) {
      clearTimeout(resendTimer.current);
    }
  }, []);

  const handleVerify = () => {
    const completeCode = code.join('');
    if (completeCode.length !== 6) {
      Alert.alert('Código incompleto', 'Digite os seis dígitos enviados para seu e-mail.');
      return;
    }

    verificarEmail(email, completeCode, () => {
      Alert.alert('E-mail confirmado', 'Sua conta está ativa. Entre com seu e-mail e senha.', [
        {
          text: 'Ir para entrar',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
        },
      ]);
    });
  };

  const handleResend = async () => {
    if (!canResend || carregando) {
      return;
    }

    const sent = await reenviarVerificacaoEmail(email);
    if (sent) {
      setCanResend(false);
      resendTimer.current = setTimeout(() => setCanResend(true), 60 * 1000);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Login')}>
        <Text style={[styles.backText, { color: theme.colors.primary }]}>{'< Entrar'}</Text>
      </TouchableOpacity>

      <View style={styles.stepsContainer}>
        <View style={[styles.stepDot, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.stepDotActive, { backgroundColor: theme.colors.primary }]} />
      </View>

      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Confirme seu e-mail</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Enviamos um código de seis dígitos para{'\n'}
        <Text style={[styles.emailHighlight, { color: theme.colors.onBackground }]}>{email}</Text>
      </Text>

      <OtpCodeInput value={code} onChange={setCode} />

      <CustomButton title="Confirmar e-mail" onPress={handleVerify} loading={carregando} />

      <View style={styles.resendContainer}>
        <Text style={[styles.resendText, { color: theme.colors.onSurfaceVariant }]}>Não recebeu?</Text>
        <TouchableOpacity
          onPress={handleResend}
          disabled={!canResend || carregando}
          accessibilityState={{ disabled: !canResend || carregando }}
        >
          <Text
            style={[
              styles.resendLink,
              { color: canResend ? theme.colors.primary : theme.colors.onSurfaceVariant },
            ]}
          >
            {canResend ? 'Reenviar código' : 'Aguarde 1 minuto'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
