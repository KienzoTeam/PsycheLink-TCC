import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'VerificarCodigo'>;

export default function VerificarCodigo({ navigation, route }: Props) {
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
      Alert.alert('Erro', 'Informe o código completo de 6 dígitos.');
      return;
    }
    navigation.navigate('NovaSenha');
  };

  return (
    <LinearGradient
      colors={['#eff1f5', '#e6e9ef']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'< Voltar'}</Text>
        </TouchableOpacity>

        <View style={styles.stepsContainer}>
          <View style={styles.stepDot} />
          <View style={styles.stepDotActive} />
          <View style={styles.stepDot} />
        </View>

        <Image
          source={require('../../assets/Psychelink.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>PsycheLink</Text>

        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>📨</Text>
        </View>

        <Text style={styles.title}>Verifique seu e-mail</Text>

        <Text style={styles.subtitle}>
          Enviamos um código de 6 dígitos para{'\n'}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => { inputs.current[index] = ref; }}
              style={[styles.codeInput, digit ? styles.codeInputActive : null]}
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={text => handleChange(text, index)}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleVerificar}>
          <LinearGradient
            colors={['#8839ef', '#7287fd']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Verificar código</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.demoBox}>
          <Text style={styles.demoText}>ℹ️ Demonstração: use o código <Text style={styles.demoCode}>847291</Text></Text>
        </View>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Não recebeu?</Text>
          <TouchableOpacity>
            <Text style={styles.resendLink}>🔄 Reenviar código</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </LinearGradient>
  );
}
