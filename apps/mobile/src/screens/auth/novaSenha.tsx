import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import PasswordInput from '../../components/ui/PasswordInput';
import CustomButton from '../../components/ui/CustomButton';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'NovaSenha'>;

export default function NovaSenha({ navigation, route }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = route.params;
  const { redefinirSenha } = useAuth();
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvando, setSalvando] = useState(false);

  const handleRedefinir = async () => {
    if (salvando) return;
    if (senha.length < 8) {
      Alert.alert('Senha curta demais', 'Use pelo menos 8 caracteres para proteger sua conta.');
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert('Senhas diferentes', 'As duas senhas digitadas não coincidem. Revise e tente de novo.');
      return;
    }

    setSalvando(true);
    const ok = await redefinirSenha(token, senha);
    setSalvando(false);

    if (!ok) {
      // Token expirado/inválido: volta para pedir um novo código.
      navigation.goBack();
      return;
    }

    Alert.alert('Senha atualizada', 'Agora você pode entrar com a sua nova senha.');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ScrollView 
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
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

      <View style={styles.stepsContainer}>
        <View style={[styles.stepDot, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.stepDot, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.stepDotActive, { backgroundColor: theme.colors.primary }]} />
      </View>

      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Nova senha</Text>

      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Escolha uma senha segura para proteger sua conta.
      </Text>

      <PasswordInput
        label="NOVA SENHA"
        placeholder="Mínimo 8 caracteres"
        value={senha}
        onChangeText={setSenha}
        autoComplete="new-password"
        textContentType="newPassword"
      />

      <PasswordInput
        label="CONFIRMAR SENHA"
        placeholder="Repita a nova senha"
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
        autoComplete="password"
        textContentType="password"
      />

      <CustomButton
        title={salvando ? 'Salvando...' : 'Redefinir senha'}
        onPress={handleRedefinir}
        loading={salvando}
      />
    </ScrollView>
  );
}
