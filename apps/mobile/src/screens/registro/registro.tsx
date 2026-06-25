import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from './styleRegistro';

export default function Registro({ navigation }: any) {
  return (
    <LinearGradient
      colors={['#F5F2FF', '#EEF4FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepsContainer}>
          <View style={styles.activeStep}>
            <Text style={styles.stepNumber}>1</Text>
          </View>
          <View style={styles.line} />
          <View style={styles.inactiveStep}>
            <Text style={styles.stepNumber}>2</Text>
          </View>
        </View>

        <View style={styles.stepLabelContainer}>
          <Text style={styles.activeLabel}>Cadastro</Text>
          <Text style={styles.inactiveLabel}>Vinculação</Text>
        </View>

        <Image
          source={require('../../assets/Psychelink.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.logoText}>PsycheLink</Text>

        <Text style={styles.title}>Crie sua conta</Text>

        <Text style={styles.subtitle}>
          Acompanhe sua jornada terapêutica de forma{'\n'}segura e organizada.
        </Text>

        <Text style={styles.label}>NOME COMPLETO</Text>
        <TextInput
          style={styles.input}
          placeholder="Ana Carolina Silva"
          placeholderTextColor="#a0a0a0"
        />

        <Text style={styles.label}>E-MAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="ana@email.com"
          placeholderTextColor="#a0a0a0"
        />

        <Text style={styles.label}>SENHA</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor="#a0a0a0"
          secureTextEntry
        />

        <Text style={styles.label}>CONFIRMAR SENHA</Text>
        <TextInput
          style={styles.input}
          placeholder="Repita a senha"
          placeholderTextColor="#a0a0a0"
          secureTextEntry
        />

        <Text style={styles.label}>DATA DE NASCIMENTO</Text>
        <TextInput
          style={styles.input}
          placeholder="dd/mm/aaaa"
          placeholderTextColor="#a0a0a0"
        />

        <View style={styles.checkboxContainer}>
          <View style={styles.checkbox} />
          <Text style={styles.termsText}>
            Li e concordo com os
            <Text style={styles.link}> Termos de Uso </Text>
            e a
            <Text style={styles.link}> Política de Privacidade</Text>.
          </Text>
        </View>

        <TouchableOpacity>
          <LinearGradient
            colors={['#7B68EE', '#6957E8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  );
}