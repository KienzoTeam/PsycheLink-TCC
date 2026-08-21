import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme/ThemeContext';
import CustomInput from '../../components/ui/CustomInput';
import CustomButton from '../../components/ui/CustomButton';
import { styles } from './styleEsqueciSenha';
import { erroEmail } from '../../lib/email';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'EsqueciSenha'>;

export default function EsqueciSenha({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const { solicitarRedefinicao } = useAuth();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleEnviar = async () => {
    if (enviando || erroEmail(email)) {
      return;
    }

    setEnviando(true);
    // A resposta é genérica por design; navegamos independentemente de a conta existir.
    await solicitarRedefinicao(email);
    setEnviando(false);

    navigation.navigate('VerificarCodigo', { email: email.trim(), modo: 'recuperacao' });
  };

  return (
    <ScrollView 
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container} 
      showsVerticalScrollIndicator={false}
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
        Sem problemas. Informe seu e-mail e enviaremos um código para redefinir sua senha.
      </Text>

      <CustomInput
        label="SEU E-MAIL"
        placeholder="ana@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <CustomButton
        title={enviando ? 'Enviando...' : 'Enviar código'}
        onPress={handleEnviar}
        loading={enviando}
      />
    </ScrollView>
  );
}
