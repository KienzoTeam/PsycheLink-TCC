import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mensagemDeErro, vincular } from '../../lib/vinculoService';
import CustomInput from '../../components/ui/CustomInput';
import CustomButton from '../../components/ui/CustomButton';
import { styles } from './registroStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'Vinculacao'>;

export default function Vinculacao({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [codigo, setCodigo] = useState('');
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleVincular = async () => {
    if (enviando) return;
    if (codigo.length !== 6) {
      setErroCodigo('O código tem 6 números. Confira com o seu psicólogo.');
      return;
    }

    setErroCodigo(null);
    setEnviando(true);

    try {
      await vincular(codigo);
      navigation.replace('Consentimento');
    } catch (erro) {
      setErroCodigo(
        mensagemDeErro(erro, 'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.'),
      );
      setEnviando(false);
    }
  };

  return (
    <ScrollView 
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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

      <Text style={[styles.subtitle, { color: theme.colors.subtext1 }]}>
        Digite o código de 6 números que seu psicólogo te passou. Ao vincular, ele passa a ver seu humor, hábitos e escalas. Os textos do diário ficam só com você, a menos que você escolha compartilhar um deles no check-in. Você muda isso quando quiser.
      </Text>

      <View style={[styles.infoBox, { backgroundColor: theme.colors.primaryContainer }]}>
        <Feather name="clipboard" size={18} color={theme.colors.onPrimaryContainer} />
        <Text style={[styles.infoText, { color: theme.colors.onPrimaryContainer }]}>
          O PsycheLink conecta você ao seu psicólogo de confiança. Não realizamos indicação ou busca de profissionais.
        </Text>
      </View>

      <CustomInput
        label="CÓDIGO DE VINCULAÇÃO"
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        returnKeyType="done"
        onSubmitEditing={handleVincular}
        value={codigo}
        onChangeText={(texto) => {
          setCodigo(texto.replace(/\D/g, ''));
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

      <CustomButton
        title="Vincular Conta"
        onPress={handleVincular}
        loading={enviando}
      />

      <TouchableOpacity
        style={[styles.skipButton, { borderColor: theme.colors.outline }]}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Fazer isso depois"
      >
        <Text style={[styles.skipButtonText, { color: theme.colors.primary }]}>Fazer isso depois</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}
