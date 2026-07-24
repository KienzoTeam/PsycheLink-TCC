import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme/ThemeContext';
import CustomInput from '../../components/Input/CustomInput';
import CustomButton from '../../components/Button/CustomButton';
import { styles } from './styleRegistro';

type Props = NativeStackScreenProps<RootStackParamList, 'Vinculacao'>;

export default function Vinculacao({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const [codigo, setCodigo] = useState('');

  const handleVincular = () => {
    if (codigo.length < 7) {
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
        <View style={[styles.activeStep, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.stepNumber}>✓</Text>
        </View>
        <View style={[styles.line, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.activeStep, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.stepNumber}>2</Text>
        </View>
      </View>

      <View style={styles.stepLabelContainer}>
        <Text style={[styles.activeLabel, { color: theme.colors.primary }]}>Cadastro</Text>
        <Text style={[styles.activeLabel, { color: theme.colors.primary }]}>Vinculação</Text>
      </View>

      <View style={styles.vinculacaoIconContainer}>
        <View style={[styles.vinculacaoCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={styles.vinculacaoIcon}>👤</Text>
        </View>
        <Text style={[styles.vinculacaoArrow, { color: theme.colors.primary }]}>⇄</Text>
        <View style={[styles.vinculacaoCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={styles.vinculacaoIcon}>👤</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Conecte-se ao seu psicólogo</Text>

      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Insira o código fornecido pelo seu psicólogo para vincular sua conta e iniciar seu acompanhamento pelo PsycheLink.
      </Text>

      <View style={[styles.infoBox, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text style={styles.infoIcon}>📋</Text>
        <Text style={[styles.infoText, { color: theme.colors.onPrimaryContainer }]}>
          O PsycheLink conecta você ao seu psicólogo de confiança. Não realizamos indicação ou busca de profissionais.
        </Text>
      </View>

      <CustomInput
        label="CÓDIGO DE VINCULAÇÃO"
        placeholder="PSY0000"
        autoCapitalize="characters"
        value={codigo}
        onChangeText={setCodigo}
        style={styles.inputCenter}
      />

      <TouchableOpacity style={styles.emailLinkContainer}>
        <Text style={[styles.emailLink, { color: theme.colors.primary }]}>✉️ Recebi um convite por e-mail</Text>
      </TouchableOpacity>

      <CustomButton
        title="Vincular Conta"
        onPress={handleVincular}
      />

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={[styles.skipButtonText, { color: theme.colors.primary }]}>Fazer isso depois</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}
