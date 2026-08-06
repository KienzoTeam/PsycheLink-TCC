import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { getEmailSyntaxError } from '../../lib/emailValidation';
import { useTheme } from '../../theme/ThemeContext';
import CustomInput from '../../components/ui/CustomInput';
import CustomButton from '../../components/ui/CustomButton';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'EsqueciSenha'>;

export default function EsqueciSenha({ navigation }: Props) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const { solicitarRedefinicaoSenha, carregando } = useAuth();
  const emailError = useMemo(() => (touched ? getEmailSyntaxError(email) : undefined), [email, touched]);

  const handleEnviar = () => {
    setTouched(true);
    if (getEmailSyntaxError(email)) {
      return;
    }
    solicitarRedefinicaoSenha(email, () => {
      navigation.navigate('VerificarCodigo', { email: email.trim() });
    });
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Login')}>
        <Text style={[styles.backText, { color: theme.colors.primary }]}>{'< Entrar'}</Text>
      </TouchableOpacity>

      <View style={styles.stepsContainer}>
        <View style={[styles.stepDotActive, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.stepDot, { backgroundColor: theme.colors.outline }]} />
        <View style={[styles.stepDot, { backgroundColor: theme.colors.outline }]} />
      </View>

      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Esqueceu sua senha?</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Informe seu e-mail e, se houver uma conta confirmada, enviaremos um código.
      </Text>

      <CustomInput
        label="SEU E-MAIL"
        placeholder="ana@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouched(true)}
        errorMessage={emailError}
      />

      <CustomButton title="Enviar código" onPress={handleEnviar} loading={carregando} />
    </ScrollView>
  );
}
