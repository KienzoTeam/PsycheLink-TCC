import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from './styleRegistro';

export default function Vinculacao({ navigation }: any) {
  const [codigo, setCodigo] = useState('');

  const handleVincular = () => {
    if (!codigo.trim()) {
      Alert.alert('Erro', 'Informe o código de vinculação.');
      return;
    }
    if (codigo.length < 7) {
      Alert.alert('Erro', 'O código deve ter 7 caracteres. Ex: PSY0000');
      return;
    }
    navigation.navigate('Login');
  };

  return (
    <LinearGradient
      colors={['#F5F2FF', '#EEF4FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'< Voltar'}</Text>
        </TouchableOpacity>

        <View style={styles.stepsContainer}>
          <View style={styles.activeStep}>
            <Text style={styles.stepNumber}>✓</Text>
          </View>
          <View style={styles.line} />
          <View style={styles.activeStep}>
            <Text style={styles.stepNumber}>2</Text>
          </View>
        </View>

        <View style={styles.stepLabelContainer}>
          <Text style={styles.activeLabel}>Cadastro</Text>
          <Text style={styles.activeLabel}>Vinculação</Text>
        </View>

        <View style={styles.vinculacaoIconContainer}>
          <View style={styles.vinculacaoCircle}>
            <Text style={styles.vinculacaoIcon}>👤</Text>
          </View>
          <Text style={styles.vinculacaoArrow}>⇄</Text>
          <View style={[styles.vinculacaoCircle, styles.vinculacaoCircleAlt]}>
            <Text style={styles.vinculacaoIcon}>👤</Text>
          </View>
        </View>

        <Text style={styles.title}>Conecte-se ao seu psicólogo</Text>

        <Text style={styles.subtitle}>
          Insira o código fornecido pelo seu psicólogo para vincular sua conta e iniciar seu acompanhamento pelo PsycheLink.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>📋</Text>
          <Text style={styles.infoText}>
            O PsycheLink conecta você ao seu psicólogo de confiança. Não realizamos indicação ou busca de profissionais.
          </Text>
        </View>

        <Text style={styles.label}>CÓDIGO DE VINCULAÇÃO</Text>
        <TextInput
          style={[styles.input, styles.inputCenter]}
          placeholder="PSY0000"
          placeholderTextColor="#c0b8e8"
          autoCapitalize="characters"
          value={codigo}
          onChangeText={setCodigo}
        />

        <TouchableOpacity style={styles.emailLinkContainer}>
          <Text style={styles.emailLink}>✉️ Recebi um convite por e-mail</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleVincular}>
          <LinearGradient
            colors={['#7B68EE', '#6957E8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Vincular Conta</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.skipButtonText}>Fazer isso depois</Text>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  );
}