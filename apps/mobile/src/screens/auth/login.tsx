import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../theme/ThemeContext";
import CustomInput from "../../components/ui/CustomInput";
import PasswordInput from "../../components/ui/PasswordInput";
import CustomButton from "../../components/ui/CustomButton";
import { styles } from "./styles";

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

export default function Login() {
  const navigation = useNavigation<LoginNavigationProp>();
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const { login } = useAuth();

  const handleLogin = () => {
    login(email, senha, () => {
      navigation.navigate("Main");
    });
  };

  return (
    <ScrollView 
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      bounces={false}
    >
      <Image
        source={require("../../assets/Psychelink.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={[styles.title, { color: theme.colors.onBackground }]}>PsycheLink</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Cuidando da sua saúde mental
      </Text>

      <View style={[styles.card, { 
        backgroundColor: isDark ? theme.colors.surface : "#ffffff",
        borderRadius: theme.borderRadius.xl 
      }]}>
        <CustomInput
          label="Email"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <PasswordInput
          label="Senha"
          placeholder="••••••••"
          value={senha}
          onChangeText={setSenha}
        />

        <CustomButton 
          title="Entrar" 
          onPress={handleLogin} 
        />

        <TouchableOpacity onPress={() => navigation.navigate("EsqueciSenha")}>
          <Text style={[styles.forgotPasswordText, { color: theme.colors.onSurfaceVariant }]}>
            Esqueci minha senha
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Vinculacao")}>
          <Text style={[styles.linkText, { color: theme.colors.primary }]}>
            Vincular-se a um psicólogo
          </Text>
        </TouchableOpacity>

        <View style={styles.separatorContainer}>
          <View style={[styles.line, { backgroundColor: theme.colors.outline }]} />
          <Text style={[styles.separatorText, { color: theme.colors.onSurfaceVariant }]}>ou</Text>
          <View style={[styles.line, { backgroundColor: theme.colors.outline }]} />
        </View>

        <CustomButton
          title="Criar conta"
          onPress={() => navigation.navigate("Registro")}
          variant="outline"
        />
      </View>

      <Text style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>
        Ao continuar, você concorda com nossos Termos de Uso e Política de
        Privacidade em conformidade com a LGPD
      </Text>
    </ScrollView>
  );
}
