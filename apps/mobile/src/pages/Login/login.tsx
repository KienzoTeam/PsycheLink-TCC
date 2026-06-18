import React from 'react';
import {StyleSheet,View,Text,TextInput,TouchableOpacity,Image,} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function Login() {
  return (
    <LinearGradient
    
    // Cores do degradê
      colors={['#d8cfff', '#d7e8ff']}

      // Direção: x=0 a x=1 faz da esquerda para a direita 
      //  Direção: y=0 a y=1 faz de cima para baixo
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}

      style={styles.container}
    >

        
        /* Logo */
      <Image
        source={require('../../assets/Psychelink.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>PsycheLink</Text>
      <Text style={styles.subtitle}>
        Cuidando da sua saúde mental
      </Text>

        {/* Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="seu@email.com"
          placeholderTextColor="#a0a0a0"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#a0a0a0"
          secureTextEntry
        />

        {/* Botão Entrar */}
        <TouchableOpacity>
          <LinearGradient
            colors={['#7C6BF7', '#5A48E8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.loginButton}
          >
            <Text style={styles.loginButtonText}>Entrar</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Vincular psicólogo */}
        <TouchableOpacity>
          <Text style={styles.linkText}>
            Vincular-se a um psicólogo
          </Text>
        </TouchableOpacity>

        {/* Separador */}
        <View style={styles.separatorContainer}>
          <View style={styles.line} />
          <Text style={styles.separatorText}>ou</Text>
          <View style={styles.line} />
        </View>

        {/* Criar conta */}
        <TouchableOpacity style={styles.registerButton}>
          <Text style={styles.registerButtonText}>
            Criar conta
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rodapé */}
      <Text style={styles.footer}>
        Ao continuar, você concorda com nossos Termos de Uso e
        Política de Privacidade em conformidade com a LGPD
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },

  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2d2d44',
  },

  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 30,
  },

  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 30,
    padding: 25,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },

  label: {
    fontSize: 15,
    color: '#3f3f46',
    marginBottom: 8,
    fontWeight: '500',
  },

  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#d7c8ff',
    borderRadius: 15,
    paddingHorizontal: 18,
    marginBottom: 18,
    backgroundColor: '#fafafa',
    fontSize: 15,
  },

  loginButton: {
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },

  loginButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },

  linkText: {
    textAlign: 'center',
    marginTop: 22,
    color: '#6c63ff',
    fontWeight: '600',
  },

  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#d6d6d6',
  },

  separatorText: {
    marginHorizontal: 10,
    color: '#777',
  },

  registerButton: {
    height: 55,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  registerButtonText: {
    color: '#6c63ff',
    fontSize: 17,
    fontWeight: '700',
  },

  footer: {
    marginTop: 25,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});