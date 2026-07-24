import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useTheme } from '../../../theme/ThemeContext';
import CustomInput from '../../../components/ui/CustomInput';
import CustomButton from '../../../components/ui/CustomButton';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'EsqueciSenha'>;

export default function EsqueciSenha({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState('');

  const handleEnviar = () => {
    if (!email.trim() || !email.includes('@')) {
      return;
    }
    navigation.navigate('VerificarCodigo', { email });
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
        title="Enviar código"
        onPress={handleEnviar}
      />
    </ScrollView>
  );
}
