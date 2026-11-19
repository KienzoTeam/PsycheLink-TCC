import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Politica_Privacidade, Termos_De_Uso, Consentimento_Dados, Aviso_Etico } from '../../constants/documentos';
import CustomInput from '../../components/ui/CustomInput';
import PasswordInput from '../../components/ui/PasswordInput';
import CustomButton from '../../components/ui/CustomButton';
import DocumentItem from '../../components/ui/DocumentItem';
import AppLogo from '../../components/ui/AppLogo';
import { styles } from './registroStyles';
import { erroEmail } from '../../lib/email';

type Props = NativeStackScreenProps<RootStackParamList, 'Registro'>;

export default function Registro({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [erroEmailCampo, setErroEmailCampo] = useState<string | null>(null);
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [privacidadeAceita, setPrivacidadeAceita] = useState(false);
  const [consentimentoAceito, setConsentimentoAceito] = useState(false);
  const [avisoAceito, setAvisoAceito] = useState(false);

  const { registro, carregando } = useAuth();

  const todosAceitos = termosAceitos && privacidadeAceita && consentimentoAceito && avisoAceito;
  const aceitosCount = [termosAceitos, privacidadeAceita, consentimentoAceito, avisoAceito].filter(Boolean).length;

  const handleDataChange = (texto: string) => {
    const apenasNumeros = texto.replace(/\D/g, '');
    let dd = apenasNumeros.slice(0, 2);
    let mm = apenasNumeros.slice(2, 4);

    // Clamp durante a digitação: nunca deixa passar de 31/99 ou 12/9999.
    if (dd.length === 2 && Number(dd) > 31) dd = '31';
    if (mm.length === 2 && Number(mm) > 12) mm = '12';

    let dataFormatada = dd + mm;
    if (dd.length === 2 && mm.length > 0) {
      dataFormatada = `${dd}/${mm}`;
      if (mm.length === 2 && apenasNumeros.length > 4) {
        dataFormatada = `${dd}/${mm}/${apenasNumeros.slice(4, 8)}`;
      }
    }
    setDataNascimento(dataFormatada);
  };

  const handleContinuar = () => {
    const erro = erroEmail(email);
    if (erro) {
      setErroEmailCampo(erro);
      return;
    }

    registro(
      nome,
      email,
      senha,
      confirmarSenha,
      dataNascimento,
      todosAceitos,
      () => {
        // Conta criada como pendente: o próximo passo é confirmar o e-mail (OTP).
        navigation.navigate('VerificarCodigo', {
          email: email.trim(),
          modo: 'cadastro'
        });
      }
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Text style={[styles.backText, { color: theme.colors.primary }]}>{'< Voltar'}</Text>
      </TouchableOpacity>

      <View style={styles.stepsContainer}>
        <View style={[styles.activeStep, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.stepNumber, { color: theme.colors.onPrimary }]}>1</Text>
        </View>
        <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
        <View style={[styles.inactiveStep, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.stepNumber, { color: theme.colors.onSurfaceVariant }]}>2</Text>
        </View>
      </View>

      <View style={styles.stepLabelContainer}>
        <Text style={[styles.activeLabel, { color: theme.colors.primary }]}>Cadastro</Text>
        <Text style={[styles.inactiveLabel, { color: theme.colors.onSurfaceVariant }]}>Vinculação</Text>
      </View>

      <AppLogo source={require('../../assets/Psychelink.png')} tamanho="grande" />
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Crie sua conta</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Acompanhe sua jornada terapêutica de forma{'\n'}segura e organizada.
      </Text>

      <CustomInput
        label="Nome completo"
        placeholder="Informe seu nome"
        value={nome}
        onChangeText={setNome}
      />

      <CustomInput
        label="E-mail"
        placeholder="Informe seu e-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={(texto) => {
          setEmail(texto);
          if (erroEmailCampo) setErroEmailCampo(null); // nunca bloqueia a digitação
        }}
        onBlur={() => setErroEmailCampo(erroEmail(email))}
      />

      {erroEmailCampo ? (
        <Text
          style={{
            color: theme.colors.error,
            fontSize: 13,
            marginLeft: 4,
            marginTop: -10,
            marginBottom: 12
          }}
          accessibilityRole="alert"
        >
          {erroEmailCampo}
        </Text>
      ) : null}

      <PasswordInput
        label="Senha"
        placeholder="Mínimo 8 caracteres"
        value={senha}
        onChangeText={setSenha}
        autoComplete="new-password"
        textContentType="newPassword"
      />

      <PasswordInput
        label="Confirmar senha"
        placeholder="Repita a senha"
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
        autoComplete="password"
        textContentType="password"
      />

      <CustomInput
        label="DATA DE NASCIMENTO"
        placeholder="dd/mm/aaaa"
        keyboardType="numeric"
        maxLength={10}
        value={dataNascimento}
        onChangeText={handleDataChange}
      />

      <Text style={[styles.secaoTitulo, { color: theme.colors.primary }]}>
        Consentimentos e documentos ({aceitosCount}/4)
      </Text>
      <Text style={[styles.secaoSubtitulo, { color: theme.colors.onSurfaceVariant }]}>
        Toque em cada documento para ler e confirme sua concordância abaixo.
      </Text>

      <DocumentItem
        titulo="Termos de Uso"
        dataAtualizacao="07 de agosto de 2026"
        conteudo={Termos_De_Uso}
        aceito={termosAceitos}
        onAceitar={() => setTermosAceitos(true)}
      />

      <DocumentItem
        titulo="Política de Privacidade (LGPD)"
        dataAtualizacao="07 de agosto de 2026"
        conteudo={Politica_Privacidade}
        aceito={privacidadeAceita}
        onAceitar={() => setPrivacidadeAceita(true)}
      />

      <DocumentItem
        titulo="Consentimento para Tratamento de Dados Sensíveis"
        dataAtualizacao="07 de agosto de 2026"
        conteudo={Consentimento_Dados}
        aceito={consentimentoAceito}
        onAceitar={() => setConsentimentoAceito(true)}
      />

      <DocumentItem
        titulo="Aviso Ético e Profissional"
        dataAtualizacao="07 de agosto de 2026"
        conteudo={Aviso_Etico}
        aceito={avisoAceito}
        onAceitar={() => setAvisoAceito(true)}
      />

      <View style={{ width: '100%', marginTop: 10, marginBottom: 32 }}>
        <CustomButton
          title="Continuar"
          disabled={!todosAceitos}
          onPress={handleContinuar}
          loading={carregando}
        />
      </View>

    </ScrollView>
  );
}