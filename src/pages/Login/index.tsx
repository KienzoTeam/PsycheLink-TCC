import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image,} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Ou 'react-native-linear-gradient'

export default function Login() {
  return (
    <LinearGradient
        // Cores do degradê
        colors={['#7c7fdb', '#b8b5ff', '#a8d5ba']}

        // Direção: x=0 a x=1 faz da esquerda para a direita
        // Direção: y=0 a y=1 faz de cima para baixo

        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        
        style={styles.boxDegrade}
      >
      

      <View style={styles.card}>
        <Image
          style={styles.logo}
          resizeMode="contain"
          source={require('../../assets/Psychelink.png')}
        />
        <Text style={styles.title}>
          PsycheLink
        </Text>
        <Text style={styles.subtitle}> 
          Ferramenta de apoio psicológico Paciente
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#777"
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#777"
          secureTextEntry={true}
        />
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>
            Entrar
          </Text>
        </TouchableOpacity>
        <Text style={styles.footer}>
          Acompanhamento emocional contínuo
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  boxDegrade: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  card: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 25,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 8,
  },

  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 10,
  },

  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 35,
    lineHeight: 22,
  },

  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#c4b5fd',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
    backgroundColor: '#ffffff',
    fontSize: 15,
  },

  button: {
    backgroundColor: '#7c3aed',
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },

  footer: {
    marginTop: 28,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
  },
});