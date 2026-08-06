import React, { useState } from 'react';
import { Alert, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeContext';
import PasswordInput from '../../components/ui/PasswordInput';
import CustomButton from '../../components/ui/CustomButton';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'NovaSenha'>;

export default function NovaSenha({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { email, code } = route.params;
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const { redefinirSenha, carregando } = useAuth();

  const handleRedefinir = () => {
    if (senha.length < 8 || senha !== confirmarSenha) {
      Alert.alert('Revise a senha', 'As senhas devem coincidir e ter no mínimo 8 caracteres.');
      return;
    }

    redefinirSenha(email, code, senha, () => {
      Alert.alert('Senha redefinida', 'Agora você já pode entrar.', [
        { text: 'Ir para entrar', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) },
      ]);
    });
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, { color: theme.colors.primary }]}>{'< Voltar'}</Text>
      </TouchableOpacity>

      <View style={styles.stepsContainer}>
        <View style={[styles.stepDot, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.stepDot, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.stepDotActive, { backgroundColor: theme.colors.primary }]} />
      </View>

      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Nova senha</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Escolha uma senha segura para proteger sua conta.</Text>

      <PasswordInput label="NOVA SENHA" placeholder="Mínimo 8 caracteres" value={senha} onChangeText={setSenha} />
      <PasswordInput
        label="CONFIRMAR SENHA"
        placeholder="Repita a nova senha"
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
      />

      <CustomButton title="Redefinir senha" onPress={handleRedefinir} loading={carregando} />
    </ScrollView>
  );
}
