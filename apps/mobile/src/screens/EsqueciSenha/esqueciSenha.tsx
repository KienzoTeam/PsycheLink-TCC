import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'EsqueciSenha'>;

export default function EsqueciSenha({ navigation }: Props) {
  const [email, setEmail] = useState('');

  const handleEnviar = () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Informe seu e-mail.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Erro', 'Informe um e-mail válido.');
      return;
    }
    navigation.navigate('VerificarCodigo', { email });
  };

  return (
    <LinearGradient
      colors={['#eff1f5', '#e6e9ef']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.backText}>{'< Entrar'}</Text>
        </TouchableOpacity>

        <View style={styles.stepsContainer}>
          <View style={styles.stepDotActive} />
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
        </View>

        <Image
          source={require('../../assets/Psychelink.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>PsycheLink</Text>

        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>✉️</Text>
        </View>

        <Text style={styles.title}>Esqueceu sua senha?</Text>

        <Text style={styles.subtitle}>
          Sem problemas. Informe seu e-mail e enviaremos um código para redefinir sua senha.
        </Text>

        <Text style={styles.label}>SEU E-MAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="ana@email.com"
          placeholderTextColor="#a0a0a0"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity onPress={handleEnviar}>
          <LinearGradient
            colors={['#8839ef', '#7287fd']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Enviar código</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  );
}
