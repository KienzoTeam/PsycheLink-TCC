import React, { useEffect, useRef, useState } from "react";
import { View, Text,TouchableOpacity, ScrollView, TextInput,Alert, Switch,} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, Ionicons } from "@expo/vector-icons"; // Importado Ionicons para o ícone de digital
import { RootStackParamList } from "../../navigation/AppNavigator";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../theme/ThemeContext";
import CustomInput from "../../components/ui/CustomInput";
import PasswordInput from "../../components/ui/PasswordInput";
import CustomButton from "../../components/ui/CustomButton";
import AppLogo from "../../components/ui/AppLogo";
import { styles } from "./loginStyles";
import { dispositivoTemDigital, biometriaEstaAtivada, salvarCredenciaisBiometria, desativarBiometria,autenticarComDigital,obterCredenciaisBiometria,} from "../../lib/biometria";

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

export default function Login() {
  const navigation = useNavigation<LoginNavigationProp>();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [biometriaAtiva, setBiometriaAtiva] = useState(false);
  const [suportaDigital, setSuportaDigital] = useState(false);
  const [validandoDigital, setValidandoDigital] = useState(false);
  const senhaRef = useRef<TextInput>(null);

  const { login, carregando } = useAuth();

  // Carrega as configurações Iniciais 
  useEffect(() => {
    (async () => {
      const temDigital = await dispositivoTemDigital();
      const jaAtivada = await biometriaEstaAtivada();
      const { email: emailSalvo } = await obterCredenciaisBiometria();

      setSuportaDigital(temDigital);
      setBiometriaAtiva(temDigital && jaAtivada);

      // Se já tiver e-mail salvo, preenche o campo para conveniência
      if (emailSalvo) {
        setEmail(emailSalvo);
      }
    })();
  }, []);

  // Lógica do Switch/Toggle na tela
  const aoAlternarSwitchBiometria = async (valor: boolean) => {
    if (!suportaDigital) {
      Alert.alert("Indisponível", "Seu aparelho não possui leitor de digital compatível.");
      return;
    }

    setBiometriaAtiva(valor);

    if (!valor) {
      await desativarBiometria();
    } else {
      Alert.alert(
        "Autenticação por Biometria",
        "Entre com e-mail e senha uma vez para salvar o acesso por digital."
      );
    }
  };

  // Login Manual (E-mail + Senha)
  const handleLoginManual = () => {
    login(
      email,
      senha,
      async () => {

        // Se a biometria estiver ativada, salva as credenciais no SecureStore
        if (biometriaAtiva && suportaDigital) {
          await salvarCredenciaisBiometria(email, senha);
        } else {
          await desativarBiometria();
        }

        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      },
      () => {
        navigation.navigate("VerificarCodigo", {
          email: email.trim(),
          modo: "cadastro",
        });
      }
    );
  };

  //Login acionado EXCLUSIVAMENTE pelo clique no botão "Entrar com Digital"
  const handleLoginComDigital = async () => {
    try {
      setValidandoDigital(true);

      //Pede a digital no leitor
      const digitalOk = await autenticarComDigital();
      if (!digitalOk) {
        setValidandoDigital(false);
        return;
      }

      //Lê e-mail e senha salvos no SecureStore
      const { email: emailSalvo, senha: senhaSalva } = await obterCredenciaisBiometria();

      if (!emailSalvo || !senhaSalva) {
        Alert.alert(
          "Configuração necessária",
          "Entre com e-mail e senha uma vez marcando a opção de biometria para ativá-la."
        );
        setValidandoDigital(false);
        return;
      }

      // Faz o login REAL no servidor
      login(
        emailSalvo,
        senhaSalva,
        () => {
          navigation.reset({ index: 0, routes: [{ name: "Main" }] });
        },
        () => {
          navigation.navigate("VerificarCodigo", {
            email: emailSalvo.trim(),
            modo: "cadastro",
          });
        }
      );
    } catch (erro) {
      console.warn("Erro no login por biometria:", erro);
      Alert.alert("Erro", "Falha ao validar a digital. Tente entrar com sua senha.");
    } finally {
      setValidandoDigital(false);
    }
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

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surfaceContainer,
            borderRadius: theme.borderRadius.xl,
            borderColor: theme.colors.outline,
          },
        ]}
      >
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
          onSubmitEditing={handleLoginManual}
        />

        {/* TOGGLE DE BIOMETRIA */}
        {suportaDigital && (
          <View
            style={{
              marginTop: 4,
              marginBottom: 16,
              paddingHorizontal: 4,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: theme.colors.onSurface,
                fontSize: 15,
                fontWeight: "500",
                flex: 1,
                paddingRight: 12,
              }}
            >
              Autenticação por biometria
            </Text>

            <Switch
              value={biometriaAtiva}
              onValueChange={aoAlternarSwitchBiometria}
              trackColor={{
                false: theme.colors.surfaceVariant,
                true: theme.colors.primary,
              }}
              thumbColor={"#FFFFFF"}
              ios_backgroundColor={theme.colors.surfaceVariant}
            />
          </View>
        )}

        <CustomButton
          title={carregando && !validandoDigital ? "Entrando..." : "Entrar"}
          onPress={handleLoginManual}
        />

        {/* Botão "ENTRAR COM DIGITAL" com o icone de digital*/}
        {biometriaAtiva && suportaDigital && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primaryContainer,
              paddingVertical: 12,
              borderRadius: theme.borderRadius.lg || 12,
              marginTop: 12,
              gap: 8,
              opacity: validandoDigital || carregando ? 0.7 : 1,
            }}
            onPress={handleLoginComDigital}
            disabled={validandoDigital || carregando}
          >
            <Ionicons name="finger-print" size={22} color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.onPrimaryContainer,
                fontWeight: "bold",
                fontSize: 15,
              }}
            >
              {validandoDigital ? "Validando digital..." : "Entrar com Digital"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate("EsqueciSenha")}
          hitSlop={{ top: 8, bottom: 8 }}
          style={{ marginTop: 12 }}
        >
          <Text style={[styles.forgotPasswordText, { color: theme.colors.onSurfaceVariant }]}>
            Esqueci minha senha
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Vinculacao")}
          hitSlop={{ top: 8, bottom: 8 }}
        >
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

      <Text style={[styles.footer, { color: theme.colors.subtext1 }]}>
        Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade em
        conformidade com a LGPD
      </Text>
    </ScrollView>
  );
}