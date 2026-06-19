import React from 'react';
import {View,Text,TextInput,TouchableOpacity,Image,} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Ou 'react-native-linear-gradient'
import { styles } from './styles';

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
       
      <Image
        source={require('../../assets/Psychelink.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>PsycheLink</Text>
      <Text style={styles.subtitle}>
        Cuidando da sua saúde mental
      </Text>

      
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

        
        <TouchableOpacity>
          <Text style={styles.linkText}>
            Vincular-se a um psicólogo
          </Text>
        </TouchableOpacity>

     
        <View style={styles.separatorContainer}>
          <View style={styles.line} />
          <Text style={styles.separatorText}>ou</Text>
          <View style={styles.line} />
        </View>

        
        <TouchableOpacity style={styles.registerButton}>
          <Text style={styles.registerButtonText}>
            Criar conta
          </Text>
        </TouchableOpacity>
      </View>

     
      <Text style={styles.footer}>
        Ao continuar, você concorda com nossos Termos de Uso e
        Política de Privacidade em conformidade com a LGPD
      </Text>
    </LinearGradient>
  );
}

