import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeContext';
import { Politica_Privacidade, Termos_De_Uso, Consentimento_Dados, Aviso_Etico } from '../../constants/documentos';
import CustomInput from '../../components/ui/CustomInput';
import PasswordInput from '../../components/ui/PasswordInput';
import CustomButton from '../../components/ui/CustomButton';
import DocumentItem from '../../components/ui/DocumentItem';
import { styles } from './registroStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'Registro'>;

export default function Registro({ navigation }: Props) {
  const { theme } = useTheme();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [privacidadeAceita, setPrivacidadeAceita] = useState(false);
  const [consentimentoAceito, setConsentimentoAceito] = useState(false);
  const [avisoAceito, setAvisoAceito] = useState(false);

  const { registro, carregando } = useAuth();

  const todosAceitos = termosAceitos && privacidadeAceita && consentimentoAceito && avisoAceito;

  const handleDataChange = (texto: string) => {
    const apenasNumeros = texto.replace(/\D/g, '');
    let dataFormatada = apenasNumeros;
    if (apenasNumeros.length > 2 && apenasNumeros.length <= 4) {
      dataFormatada = `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2)}`;
    } else if (apenasNumeros.length > 4) {
      dataFormatada = `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2, 4)}/${apenasNumeros.slice(4, 8)}`;
    }
    setDataNascimento(dataFormatada);
  };

  const handleContinuar = () => {
    registro(
      nome,
      email,
      senha,
      confirmarSenha,
      dataNascimento,
      todosAceitos,
      () => { navigation.goBack(); }
    );
  };

  const confirmacoes = [
    { aceito: termosAceitos, texto: 'Li e aceito os Termos de Uso do PsycheLink' },
    { aceito: privacidadeAceita, texto: 'Li e aceito a Política de Privacidade e as disposições da LGPD' },
    { aceito: consentimentoAceito, texto: 'Consinto com o tratamento dos meus dados sensíveis de saúde' },
    { aceito: avisoAceito, texto: 'Compreendo que o PsycheLink não substitui atendimento profissional ou serviços de emergência' },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, { color: theme.colors.primary }]}>{'< Voltar'}</Text>
      </TouchableOpacity>

      <View style={styles.stepsContainer}>
        <View style={[styles.activeStep, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.stepNumber}>1</Text>
        </View>
        <View style={[styles.line, { backgroundColor: theme.colors.outline }]} />
        <View style={[styles.inactiveStep, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.stepNumber, { color: theme.colors.onSurfaceVariant }]}>2</Text>
        </View>
      </View>

      <View style={styles.stepLabelContainer}>
        <Text style={[styles.activeLabel, { color: theme.colors.primary }]}>Cadastro</Text>
        <Text style={[styles.inactiveLabel, { color: theme.colors.onSurfaceVariant }]}>Vinculação</Text>
      </View>

      <Image
        source={require('../../assets/Psychelink.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={[styles.logoText, { color: theme.colors.onBackground }]}>PsycheLink</Text>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Crie sua conta</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Acompanhe sua jornada terapêutica de forma{'\n'}segura e organizada.
      </Text>

      <CustomInput
        label="NOME COMPLETO"
        placeholder="Ana Carolina Silva"
        value={nome}
        onChangeText={setNome}
      />

      <CustomInput
        label="E-MAIL"
        placeholder="ana@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <PasswordInput
        label="SENHA"
        placeholder="Mínimo 8 caracteres"
        value={senha}
        onChangeText={setSenha}
      />

      <PasswordInput
        label="CONFIRMAR SENHA"
        placeholder="Repita a senha"
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
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
        CONSENTIMENTOS E DOCUMENTOS
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

      <Text style={[styles.secaoTitulo, { color: theme.colors.primary }]}>
        CONFIRME SUA LEITURA E ACEITAÇÃO
      </Text>

      {confirmacoes.map((item, index) => (
        <View key={index} style={styles.confirmacaoItem}>
          <View style={[
            styles.confirmacaoCheck,
            { borderColor: item.aceito ? theme.colors.primary : theme.colors.outline },
            item.aceito && { backgroundColor: theme.colors.primary }
          ]}>
            {item.aceito && <Feather name="check" size={12} color="#FFF" />}
          </View>
          <Text style={[styles.confirmacaoTexto, { color: theme.colors.onSurfaceVariant }]}>
            {item.texto}
          </Text>
        </View>
      ))}

      <View style={{ width: '100%', marginTop: 10, marginBottom: 30, opacity: todosAceitos ? 1 : 0.5 }}>
        <CustomButton
          title="Continuar"
          onPress={() => todosAceitos && handleContinuar()}
          loading={carregando}
        />
      </View>

    </ScrollView>
  );
}