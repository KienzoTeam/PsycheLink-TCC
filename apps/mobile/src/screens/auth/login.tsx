import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, TextInputInstance } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../theme/ThemeContext";
import CustomInput from "../../components/ui/CustomInput";
import PasswordInput from "../../components/ui/PasswordInput";
import CustomButton from "../../components/ui/CustomButton";
import AppLogo from "../../components/ui/AppLogo";
import { styles } from "./loginStyles";

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

export default function Login() {
  const navigation = useNavigation<LoginNavigationProp>();
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const senhaRef = useRef<TextInputInstance>(null);
  const { login, carregando } = useAuth();

  const handleLogin = () => {
    // O "done" do teclado também chama aqui: sem a trava, dava para enviar duas vezes.
    if (carregando) return;
    login(
      email,
      senha,
      () => {
        // Sessão iniciada: limpa a pilha para o back não voltar ao Login.
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      },
      // Conta pendente de confirmação: vai direto para a tela do código OTP.
      () => {
        navigation.navigate("VerificarCodigo", {
          email: email.trim(),
          modo: "cadastro"
        });
      }
    );
  };

  return (
    <ScrollView 
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      bounces={false}
      keyboardShouldPersistTaps="handled"
    >
      <AppLogo source={require("../../assets/Psychelink.png")} tamanho="grande" />

      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Cuidando da sua saúde mental
      </Text>

      <View style={[styles.card, {
        backgroundColor: theme.colors.surfaceContainer,
        borderRadius: theme.borderRadius.xl,
        borderColor: theme.colors.outline
      }]}>
        <CustomInput
          label="Email"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => senhaRef.current?.focus()}
        />

        <PasswordInput
          ref={senhaRef}
          label="Senha"
          placeholder="••••••••"
          value={senha}
          onChangeText={setSenha}
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <CustomButton
          title={carregando ? 'Entrando...' : 'Entrar'}
          onPress={handleLogin}
          loading={carregando}
        />

        <TouchableOpacity onPress={() => navigation.navigate("EsqueciSenha")} hitSlop={{ top: 8, bottom: 8 }}>
          <Text style={[styles.forgotPasswordText, { color: theme.colors.onSurfaceVariant }]}>
            Esqueci minha senha
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

      <Text style={[styles.footer, { color: theme.colors.subtext1 }]}>
        Ao continuar, você concorda com nossos Termos de Uso e Política de
        Privacidade em conformidade com a LGPD
      </Text>
    </ScrollView>
  );
}
