import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { styles } from './styleEsqueciSenha';

type Props = NativeStackScreenProps<RootStackParamList, 'NovaSenha'>;

export default function NovaSenha({ navigation }: Props) {
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const handleRedefinir = () => {
    if (!senha.trim() || senha.length < 8) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }
    navigation.navigate('Login');
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
          <View style={styles.stepDot} />
          <View style={styles.stepDotActive} />
        </View>

        <Image
          source={require('../../assets/Psychelink.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>PsycheLink</Text>

        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>🔒</Text>
        </View>

        <Text style={styles.title}>Nova senha</Text>

        <Text style={styles.subtitle}>
          Escolha uma senha segura para proteger sua conta.
        </Text>

        <Text style={styles.label}>NOVA SENHA</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputFlex}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor="#a0a0a0"
            secureTextEntry={!showSenha}
            value={senha}
            onChangeText={setSenha}
          />
          <TouchableOpacity onPress={() => setShowSenha(!showSenha)}>
            <Text style={styles.eyeText}>{showSenha ? '◉' : '◎'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>CONFIRMAR SENHA</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputFlex}
            placeholder="Repita a nova senha"
            placeholderTextColor="#a0a0a0"
            secureTextEntry={!showConfirmar}
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
          />
          <TouchableOpacity onPress={() => setShowConfirmar(!showConfirmar)}>
            <Text style={styles.eyeText}>{showConfirmar ? '◉' : '◎'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleRedefinir}>
          <LinearGradient
            colors={['#8839ef', '#7287fd']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Redefinir senha</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  );
}
