import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alertarDemonstracao } from '../../lib/prototipo';
import CustomInput from '../../components/ui/CustomInput';
import CustomButton from '../../components/ui/CustomButton';
import { styles } from './registroStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'Vinculacao'>;

export default function Vinculacao({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [codigo, setCodigo] = useState('');
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);

  const handleVincular = () => {
    const valor = codigo.trim().toUpperCase();

    if (!valor) {
      setErroCodigo('Insira o código recebido do seu psicólogo.');
      return;
    }
    if (!/^PSY\d{4}$/.test(valor)) {
      setErroCodigo('O código segue o formato PSY0000: PSY seguido de 4 números.');
      return;
    }

    setErroCodigo(null);
    // Sem backend nesta demonstração: sinalizamos honestamente e permanecemos aqui.
    alertarDemonstracao();
  };

  return (
    <ScrollView 
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}
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
        <View style={[styles.activeStep, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.stepNumber, { color: theme.colors.onPrimary }]}>✓</Text>
        </View>
        <View style={[styles.line, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.activeStep, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.stepNumber, { color: theme.colors.onPrimary }]}>2</Text>
        </View>
      </View>

      <View style={styles.stepLabelContainer}>
        <Text style={[styles.activeLabel, { color: theme.colors.primary }]}>Cadastro</Text>
        <Text style={[styles.activeLabel, { color: theme.colors.primary }]}>Vinculação</Text>
      </View>

      <View style={styles.vinculacaoIconContainer}>
        <View style={[styles.vinculacaoCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Feather name="user" size={28} color={theme.colors.onSurfaceVariant} />
        </View>
        <Feather name="repeat" size={22} color={theme.colors.primary} />
        <View style={[styles.vinculacaoCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Feather name="clipboard" size={26} color={theme.colors.primary} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Conecte-se ao seu psicólogo</Text>

      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Insira o código fornecido pelo seu psicólogo para vincular sua conta e iniciar seu acompanhamento pelo PsycheLink.
      </Text>

      <View style={[styles.infoBox, { backgroundColor: theme.colors.primaryContainer }]}>
        <Feather name="clipboard" size={18} color={theme.colors.onPrimaryContainer} />
        <Text style={[styles.infoText, { color: theme.colors.onPrimaryContainer }]}>
          O PsycheLink conecta você ao seu psicólogo de confiança. Não realizamos indicação ou busca de profissionais.
        </Text>
      </View>

      <CustomInput
        label="CÓDIGO DE VINCULAÇÃO"
        placeholder="PSY0000"
        autoCapitalize="characters"
        value={codigo}
        onChangeText={(texto) => {
          setCodigo(texto);
          if (erroCodigo) setErroCodigo(null);
        }}
        style={[styles.inputCenter, { color: theme.colors.onSurface }]}
      />
      {erroCodigo && (
        <Text
          style={[styles.erroCodigo, { color: theme.colors.error }]}
          accessibilityRole="alert"
        >
          {erroCodigo}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.emailLinkContainer, { flexDirection: 'row', gap: 6 }]}
        onPress={() => alertarDemonstracao()}
      >
        <Feather name="mail" size={16} color={theme.colors.primary} />
        <Text style={[styles.emailLink, { color: theme.colors.primary }]}>Recebi um convite por e-mail</Text>
      </TouchableOpacity>

      <CustomButton
        title="Vincular Conta"
        onPress={handleVincular}
      />

      <TouchableOpacity
        style={[styles.skipButton, { borderColor: theme.colors.outline }]}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
      >
        <Text style={[styles.skipButtonText, { color: theme.colors.primary }]}>Fazer isso depois</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}
