import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme/ThemeContext';
import CustomButton from '../../components/ui/CustomButton';
import OtpCodeInput from '../../components/ui/OtpCodeInput';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'VerificarCodigo'>;

export default function VerificarCodigo({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { email } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);

  const handleContinuar = () => {
    const completeCode = code.join('');
    if (completeCode.length !== 6) {
      Alert.alert('Código incompleto', 'Digite os seis dígitos enviados para seu e-mail.');
      return;
    }
    navigation.navigate('NovaSenha', { email, code: completeCode });
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
        <View style={[styles.stepDotActive, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.stepDot, { backgroundColor: theme.colors.outline }]} />
      </View>

      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Verifique seu e-mail</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Enviamos um código de seis dígitos para{'\n'}
        <Text style={[styles.emailHighlight, { color: theme.colors.onBackground }]}>{email}</Text>
      </Text>

      <OtpCodeInput value={code} onChange={setCode} />
      <CustomButton title="Continuar" onPress={handleContinuar} />
    </ScrollView>
  );
}
