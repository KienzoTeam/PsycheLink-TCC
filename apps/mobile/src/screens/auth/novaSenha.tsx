import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import PasswordInput from '../../components/ui/PasswordInput';
import CustomButton from '../../components/ui/CustomButton';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'NovaSenha'>;

export default function NovaSenha({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { token } = route.params;
  const { redefinirSenha } = useAuth();
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvando, setSalvando] = useState(false);

  const handleRedefinir = async () => {
    if (salvando) return;
    if (senha.length < 8) {
      Alert.alert('Atenção', 'A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
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

    Alert.alert('Sucesso', 'Sua senha foi redefinida. Faça login com a nova senha.');
    navigation.navigate('Login');
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
      />

      <PasswordInput
        label="CONFIRMAR SENHA"
        placeholder="Repita a nova senha"
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
      />

      <CustomButton
        title={salvando ? 'Salvando...' : 'Redefinir senha'}
        onPress={handleRedefinir}
        loading={salvando}
      />
    </ScrollView>
  );
}
