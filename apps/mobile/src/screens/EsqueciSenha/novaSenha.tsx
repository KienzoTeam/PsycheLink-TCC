import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme/ThemeContext';
import PasswordInput from '../../components/Input/PasswordInput';
import CustomButton from '../../components/Button/CustomButton';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'NovaSenha'>;

export default function NovaSenha({ navigation }: Props) {
  const { theme } = useTheme();
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const handleRedefinir = () => {
    if (senha.length < 8 || senha !== confirmarSenha) {
      return;
    }
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
        title="Redefinir senha"
        onPress={handleRedefinir}
      />
    </ScrollView>
  );
}
