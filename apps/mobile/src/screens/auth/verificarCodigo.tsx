import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useTheme } from '../../../theme/ThemeContext';
import CustomButton from '../../../components/ui/CustomButton';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'VerificarCodigo'>;

export default function VerificarCodigo({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { email } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleVerificar = () => {
    const codigoCompleto = code.join('');
    if (codigoCompleto.length < 6) {
      return;
    }
    navigation.navigate('NovaSenha');
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
        <View style={[styles.stepDotActive, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.stepDot, { backgroundColor: theme.colors.outline }]} />
      </View>

      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Verifique seu e-mail</Text>

      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Enviamos um código de 6 dígitos para{'\n'}
        <Text style={[styles.emailHighlight, { color: theme.colors.onBackground }]}>{email}</Text>
      </Text>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => { inputs.current[index] = ref; }}
            style={[
              styles.codeInput, 
              { 
                backgroundColor: theme.colors.surface, 
                borderColor: digit ? theme.colors.primary : theme.colors.outline,
                color: theme.colors.onSurface
              },
              digit ? styles.codeInputActive : null
            ]}
            maxLength={1}
            keyboardType="number-pad"
            value={digit}
            onChangeText={text => handleChange(text, index)}
          />
        ))}
      </View>

      <CustomButton
        title="Verificar código"
        onPress={handleVerificar}
      />

      <View style={[styles.demoBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
        <Text style={[styles.demoText, { color: theme.colors.onSurfaceVariant }]}>ℹ️ Demonstração: use o código <Text style={[styles.demoCode, { color: theme.colors.onSurface }]}>847291</Text></Text>
      </View>

      <View style={styles.resendContainer}>
        <Text style={[styles.resendText, { color: theme.colors.onSurfaceVariant }]}>Não recebeu?</Text>
        <TouchableOpacity>
          <Text style={[styles.resendLink, { color: theme.colors.primary }]}>🔄 Reenviar código</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
