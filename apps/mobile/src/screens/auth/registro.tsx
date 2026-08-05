import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeContext';
import CustomInput from '../../components/ui/CustomInput';
import PasswordInput from '../../components/ui/PasswordInput';
import CustomButton from '../../components/ui/CustomButton';
import { styles } from './registroStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'Registro'>;

export default function Registro({ navigation }: Props) {
  const { theme } = useTheme();
  const [aceito, setAceito] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  
  const { registro, carregando } = useAuth();

  // ✅ Função inteligente que aplica a máscara dd/mm/aaaa automaticamente
  const handleDataChange = (texto: string) => {
    const apenasNumeros = texto.replace(/\D/g, '');
    let dataFormatada = apenasNumeros;

    if (apenasNumeros.length > 2 && apenasNumeros.length <= 4) {
      dataFormatada = `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2)}`;
    } else if (apenasNumeros.length > 4) {
      dataFormatada = `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2, 4)}/${apenasNumeros.slice(4, 8)}`;
    }

    setDataNascimento(dataFormatada);
  };

  const handleContinuar = () => {
    registro(
      nome, 
      email, 
      senha, 
      confirmarSenha, 
      dataNascimento, 
      aceito, 
      () => {
        navigation.goBack(); 
      }
    );
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
        <View style={[styles.activeStep, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.stepNumber}>1</Text>
        </View>
        <View style={[styles.line, { backgroundColor: theme.colors.outline }]} />
        <View style={[styles.inactiveStep, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.stepNumber, { color: theme.colors.onSurfaceVariant }]}>2</Text>
        </View>
      </View>

      <View style={styles.stepLabelContainer}>
        <Text style={[styles.activeLabel, { color: theme.colors.primary }]}>Cadastro</Text>
        <Text style={[styles.inactiveLabel, { color: theme.colors.onSurfaceVariant }]}>Vinculação</Text>
      </View>

      <Image
        source={require('../../assets/Psychelink.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={[styles.logoText, { color: theme.colors.onBackground }]}>PsycheLink</Text>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Crie sua conta</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Acompanhe sua jornada terapêutica de forma{'\n'}segura e organizada.
      </Text>

      <CustomInput
        label="NOME COMPLETO"
        placeholder="Ana Carolina Silva"
        value={nome}
        onChangeText={setNome}
      />

      <CustomInput
        label="E-MAIL"
        placeholder="ana@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <PasswordInput
        label="SENHA"
        placeholder="Mínimo 8 caracteres"
        value={senha}
        onChangeText={setSenha}
      />

      <PasswordInput
        label="CONFIRMAR SENHA"
        placeholder="Repita a senha"
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
      />

      {/* ✅ Campo de data atualizado com máscara automática e teclado numérico seguro */}
      <CustomInput
        label="DATA DE NASCIMENTO"
        placeholder="dd/mm/aaaa"
        keyboardType="numeric"
        maxLength={10}
        value={dataNascimento}
        onChangeText={handleDataChange}
      />

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setAceito(!aceito)}
        activeOpacity={0.8}
      >
        <View style={[
          styles.checkbox, 
          { borderColor: theme.colors.outline },
          aceito && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
        ]}>
          {aceito && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={[styles.termsText, { color: theme.colors.onSurfaceVariant }]}>
          Li e concordo com os
          <Text style={[styles.link, { color: theme.colors.primary }]}> Termos de Uso </Text>
          e a
          <Text style={[styles.link, { color: theme.colors.primary }]}> Política de Privacidade</Text>.
        </Text>
      </TouchableOpacity>

      <View style={{ width: '100%', marginTop: 10, marginBottom: 30 }}>
        <CustomButton
          title="Continuar"
          onPress={handleContinuar}
          loading={carregando}
        />
      </View>

    </ScrollView>
  );
}