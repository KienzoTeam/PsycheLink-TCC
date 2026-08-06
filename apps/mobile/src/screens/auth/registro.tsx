import React, { useMemo, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { z } from 'zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeContext';
import { toIsoBirthDate } from '../../lib/birthDate';
import { emailSyntaxSchema, getEmailSyntaxError } from '../../lib/emailValidation';
import CustomInput from '../../components/ui/CustomInput';
import PasswordInput from '../../components/ui/PasswordInput';
import CustomButton from '../../components/ui/CustomButton';
import { styles } from './registroStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'Registro'>;

const registrationFormSchema = z
  .object({
    nome: z.string().trim().min(2),
    email: emailSyntaxSchema,
    senha: z.string().min(8),
    confirmarSenha: z.string(),
    dataNascimento: z.string().min(1),
    aceito: z.literal(true),
  })
  .refine((values) => values.senha === values.confirmarSenha, {
    path: ['confirmarSenha'],
  });

function onlyAsciiDigits(value: string): string {
  return Array.from(value)
    .filter((character) => character >= '0' && character <= '9')
    .join('');
}

export default function Registro({ navigation }: Props) {
  const { theme } = useTheme();
  const [aceito, setAceito] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const { registro, carregando } = useAuth();

  const emailError = useMemo(
    () => (emailTouched ? getEmailSyntaxError(email) : undefined),
    [email, emailTouched],
  );

  const handleDataChange = (text: string) => {
    const digits = onlyAsciiDigits(text).slice(0, 8);
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    const formatted = year ? `${day}/${month}/${year}` : month ? `${day}/${month}` : day;
    setDataNascimento(formatted);
  };

  const handleContinuar = () => {
    setEmailTouched(true);
    const form = registrationFormSchema.safeParse({
      nome,
      email,
      senha,
      confirmarSenha,
      dataNascimento,
      aceito,
    });
    const isoBirthDate = toIsoBirthDate(dataNascimento);

    if (!form.success || !isoBirthDate) {
      if (!isoBirthDate && dataNascimento) {
        Alert.alert('Data de nascimento inválida', 'Use uma data real no formato dd/mm/aaaa.');
      } else {
        Alert.alert('Revise seu cadastro', 'Preencha todos os campos, use uma senha de ao menos 8 caracteres e aceite os termos.');
      }
      return;
    }

    registro(nome, email, senha, isoBirthDate, (registeredEmail) => {
      navigation.replace('VerificarEmail', { email: registeredEmail });
    });
  };

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
        <Text style={[styles.inactiveLabel, { color: theme.colors.onSurfaceVariant }]}>Confirmação</Text>
      </View>

      <Image source={require('../../assets/Psychelink.png')} style={styles.logo} resizeMode="contain" />

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
        autoCapitalize="words"
      />

      <CustomInput
        label="E-MAIL"
        placeholder="ana@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        onBlur={() => setEmailTouched(true)}
        errorMessage={emailError}
        helperText={emailTouched ? undefined : 'Enviaremos um código para confirmar este endereço.'}
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
        inputMode="numeric"
        maxLength={10}
        value={dataNascimento}
        onChangeText={handleDataChange}
      />

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setAceito((current) => !current)}
        activeOpacity={0.8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: aceito }}
      >
        <View
          style={[
            styles.checkbox,
            { borderColor: theme.colors.outline },
            aceito && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
          ]}
        >
          {aceito && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={[styles.termsText, { color: theme.colors.onSurfaceVariant }]}>
          Li e concordo com os
          <Text style={[styles.link, { color: theme.colors.primary }]}> Termos de Uso </Text>
          e a
          <Text style={[styles.link, { color: theme.colors.primary }]}> Política de Privacidade</Text>.
        </Text>
      </TouchableOpacity>

      <View style={{ width: '100%', marginTop: 10, marginBottom: 30 }}>
        <CustomButton title="Continuar" onPress={handleContinuar} loading={carregando} />
      </View>
    </ScrollView>
  );
}
