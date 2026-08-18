import React, { useState } from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, Alert} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeContext';
import CustomButton from '../../../components/ui/CustomButton';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { styles } from './styleCheckin';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkin'>;

const total_etapas = 7;

const emocoes = [
  { id: 'feliz', label: 'Feliz', icone: 'smile' },
  { id: 'triste', label: 'Triste', icone: 'frown' },
  { id: 'ansioso', label: 'Ansioso', icone: 'zap' },
  { id: 'calmo', label: 'Calmo', icone: 'sun' },
  { id: 'irritado', label: 'Irritado', icone: 'cloud-rain' },
  { id: 'cansado', label: 'Cansado', icone: 'battery' },
];

const contextos = [
  { id: 'trabalho', label: 'Trabalho', icone: 'briefcase' },
  { id: 'familia', label: 'Família', icone: 'users' },
  { id: 'relacionamento', label: 'Relacionamento', icone: 'heart' },
  { id: 'saude', label: 'Saúde', icone: 'activity' },
  { id: 'financas', label: 'Finanças', icone: 'sun' },
];

const habitos = [
  { id: 'hidratacao', label: 'Hidratação', icone: 'droplet' },
  { id: 'exercicio', label: 'Exercício', icone: 'zap' },
  { id: 'meditacao', label: 'Meditação', icone: 'wind' },
  { id: 'telas', label: 'Tempo de telas', icone: 'smartphone' },
  { id: 'social', label: 'Contato social', icone: 'users' },
];

export default function Checkin({ navigation }: Props) {
  const { theme } = useTheme();
  const [etapa, setEtapa] = useState(1);

  // Etapa 1 - Aba de Emoções
  const [emocoesSelecionadas, setEmocoesSelecionadas] = useState<string[]>([]);

  // Etapa 2 - Intensidade de Humores
  const [intensidade, setIntensidade] = useState(5);
  const [humor, setHumor] = useState(5);
  const [ansiedade, setAnsiedade] = useState(5);

  // Etapa 3 - Sono
  const [horasSono, setHorasSono] = useState(7);
  const [qualidadeSono, setQualidadeSono] = useState<string | null>(null);

  // Etapa 4 - Contextos (possiveis gatilhos)
  const [contextosSelecionados, setContextosSelecionados] = useState<string[]>([]);

  // Etapa 5 - Hábitos 
  const [habitosSelecionados, setHabitosSelecionados] = useState<string[]>([]);

  // Etapa 6 - Diário Emocional
  const [notas, setNotas] = useState('');

  const progresso = (etapa / total_etapas) * 100;

  const toggleItem = (
    id: string,
    lista: string[],
    setLista: (l: string[]) => void
  ) => {
    if (lista.includes(id)) {
      setLista(lista.filter(i => i !== id));
    } else {
      setLista([...lista, id]);
    }
  };

  const proximaEtapa = () => {
    if (etapa === 1 && emocoesSelecionadas.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos uma emoção.');
      return;
    }
    if (etapa < total_etapas) setEtapa(etapa + 1);
  };

  const etapaAnterior = () => {
    if (etapa > 1) setEtapa(etapa - 1);
  };

  const renderProgresso = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressInfo}>
        <Text style={[styles.progressLabel, { color: theme.colors.onSurfaceVariant }]}>
          Etapa {etapa} de {total_etapas}
        </Text>
        <Text style={[styles.progressPercent, { color: theme.colors.primary }]}>
          {Math.round(progresso)}%
        </Text>
      </View>
      <View style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={[styles.progressFill, { width: `${progresso}%`, backgroundColor: theme.colors.primary }]} />
      </View>
    </View>
  );

  const renderEtapa1 = () => (
    <View style={styles.content}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>
        Como você está se sentindo?
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Selecione todas as emoções que você sente agora
      </Text>
      <View style={styles.emocoesGrid}>
        {emocoes.map(e => {
          const selecionado = emocoesSelecionadas.includes(e.id);
          return (
            <TouchableOpacity
              key={e.id}
              style={[
                styles.emocaoItem,
                {
                  borderColor: selecionado ? theme.colors.primary : theme.colors.outline,
                  backgroundColor: selecionado ? theme.colors.primaryContainer : theme.colors.surface,
                }
              ]}
              onPress={() => toggleItem(e.id, emocoesSelecionadas, setEmocoesSelecionadas)}
            >
              <Feather
                name={e.icone as any}
                size={28}
                color={selecionado ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.emocaoLabel, { color: selecionado ? theme.colors.primary : theme.colors.onBackground }]}>
                {e.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.footerSingle}>
        <CustomButton title="Próximo →" onPress={proximaEtapa} />
      </View>
    </View>
  );

  const renderSlider = (label: string, value: number, onChange: (v: number) => void) => (
    <View style={styles.sliderItem}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.sliderLabel, { color: theme.colors.onBackground }]}>{label}</Text>
        <Text style={[styles.sliderValue, { color: theme.colors.primary }]}>{value}/10</Text>
      </View>
      <View style={[styles.sliderTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={[styles.sliderFill, { width: `${value * 10}%`, backgroundColor: theme.colors.primary }]} />
        <TouchableOpacity
          style={[styles.sliderThumb, {
            left: `${value * 10 - 3}%`,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.primary,
          }]}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(v => (
          <TouchableOpacity key={v} onPress={() => onChange(v)}>
            <View style={{
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: v === value ? theme.colors.primary : 'transparent',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{ fontSize: 10, color: v === value ? '#FFF' : theme.colors.onSurfaceVariant }}>{v}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEtapa2 = () => (
    <View style={styles.content}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Vamos detalhar</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Ajuste os indicadores abaixo
      </Text>
      <View style={[styles.slidersCard, { backgroundColor: theme.colors.surface }]}>
        {renderSlider('Intensidade Emocional', intensidade, setIntensidade)}
        {renderSlider('Humor Geral', humor, setHumor)}
        {renderSlider('Ansiedade Percebida', ansiedade, setAnsiedade)}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btnVoltar, { borderColor: theme.colors.outline }]} onPress={etapaAnterior}>
          <Text style={[styles.btnVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <CustomButton title="Próximo →" onPress={proximaEtapa} />
        </View>
      </View>
    </View>
  );

  const renderEtapa3 = () => (
    <View style={styles.content}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Como foi seu sono?</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        O sono impacta muito nosso bem-estar
      </Text>
      <View style={[styles.sonoCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.sliderItem}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: theme.colors.onBackground }]}>Horas Dormidas</Text>
            <Text style={[styles.sliderValue, { color: theme.colors.primary }]}>{horasSono}h</Text>
          </View>
          <View style={[styles.sliderTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={[styles.sliderFill, { width: `${(horasSono / 12) * 100}%`, backgroundColor: theme.colors.primary }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(v => (
              <TouchableOpacity key={v} onPress={() => setHorasSono(v)}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: v === horasSono ? theme.colors.primary : 'transparent',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 9, color: v === horasSono ? '#FFF' : theme.colors.onSurfaceVariant }}>{v}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text style={[styles.sliderLabel, { color: theme.colors.onBackground, marginBottom: 10 }]}>Qualidade do Sono</Text>
          <View style={styles.qualidadeContainer}>
            {['Ruim', 'Regular', 'Boa'].map(q => (
              <TouchableOpacity
                key={q}
                style={[
                  styles.qualidadeBtn,
                  {
                    borderColor: qualidadeSono === q ? theme.colors.primary : theme.colors.outline,
                    backgroundColor: qualidadeSono === q ? theme.colors.primaryContainer : 'transparent',
                  }
                ]}
                onPress={() => setQualidadeSono(q)}
              >
                <Text style={[styles.qualidadeText, { color: qualidadeSono === q ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                  {q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btnVoltar, { borderColor: theme.colors.outline }]} onPress={etapaAnterior}>
          <Text style={[styles.btnVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <CustomButton title="Próximo →" onPress={proximaEtapa} />
        </View>
      </View>
    </View>
  );

  const renderEtapa4 = () => (
    <View style={styles.content}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Contextos relevantes</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        O que mais te impactou hoje?
      </Text>
      <View style={styles.contextosGrid}>
        {contextos.map(c => {
          const selecionado = contextosSelecionados.includes(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.contextoItem,
                {
                  borderColor: selecionado ? theme.colors.primary : theme.colors.outline,
                  backgroundColor: selecionado ? theme.colors.primaryContainer : theme.colors.surface,
                }
              ]}
              onPress={() => toggleItem(c.id, contextosSelecionados, setContextosSelecionados)}
            >
              <Feather
                name={c.icone as any}
                size={28}
                color={selecionado ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.contextoLabel, { color: selecionado ? theme.colors.primary : theme.colors.onBackground }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btnVoltar, { borderColor: theme.colors.outline }]} onPress={etapaAnterior}>
          <Text style={[styles.btnVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <CustomButton title="Próximo →" onPress={proximaEtapa} />
        </View>
      </View>
    </View>
  );

  const renderEtapa5 = () => (
    <View style={styles.content}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Hábitos de hoje</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Marque o que você fez hoje
      </Text>
      <View style={styles.habitosList}>
        {habitos.map(h => {
          const selecionado = habitosSelecionados.includes(h.id);
          return (
            <TouchableOpacity
              key={h.id}
              style={[
                styles.habitoItem,
                {
                  borderColor: selecionado ? theme.colors.primary : theme.colors.outline,
                  backgroundColor: selecionado ? theme.colors.primaryContainer : theme.colors.surface,
                }
              ]}
              onPress={() => toggleItem(h.id, habitosSelecionados, setHabitosSelecionados)}
            >
              <View style={[styles.habitoIconContainer, { backgroundColor: selecionado ? theme.colors.primary : theme.colors.surfaceVariant }]}>
                <Feather
                  name={h.icone as any}
                  size={20}
                  color={selecionado ? '#FFF' : theme.colors.onSurfaceVariant}
                />
              </View>
              <Text style={[styles.habitoLabel, { color: selecionado ? theme.colors.primary : theme.colors.onBackground }]}>
                {h.label}
              </Text>
              {selecionado && <Feather name="check" size={18} color={theme.colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btnVoltar, { borderColor: theme.colors.outline }]} onPress={etapaAnterior}>
          <Text style={[styles.btnVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <CustomButton title="Próximo →" onPress={proximaEtapa} />
        </View>
      </View>
    </View>
  );

const renderEtapa6 = () => (
  <View style={styles.content}>
    <Text style={[styles.title, { color: theme.colors.onBackground }]}>Algo mais a compartilhar?</Text>
    <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
      Escreva como você se sente (opcional)
    </Text>
    <TextInput
      style={[
        styles.notasInput,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
          color: theme.colors.onSurface,
        }
      ]}
      placeholder="Escreva aqui seus pensamentos, sensações ou algo que aconteceu hoje..."
      placeholderTextColor={theme.colors.onSurfaceVariant}
      multiline
      value={notas}
      onChangeText={setNotas}
    />
    <View style={[styles.privacidadeBox, { backgroundColor: theme.colors.primaryContainer }]}>
      <Feather name="lock" size={16} color={theme.colors.primary} />
      <Text style={[styles.privacidadeTexto, { color: theme.colors.primary }]}>
        Seus registros são privados e compartilhados apenas com seu psicólogo vinculado.
      </Text>
    </View>
    <View style={styles.footer}>
      <TouchableOpacity style={[styles.btnVoltar, { borderColor: theme.colors.outline }]} onPress={etapaAnterior}>
        <Text style={[styles.btnVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <CustomButton title="✓ Salvar Registro" onPress={proximaEtapa} />
      </View>
    </View>
  </View>
);

  const renderEtapa7 = () => (
    <View style={styles.content}>
      <View style={styles.sucessoContainer}>
        <View style={[styles.sucessoIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <Feather name="check" size={36} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.onBackground, textAlign: 'center' }]}>
          💜 Registro salvo
        </Text>
        <Text style={[styles.sucessoSubtitulo, { color: theme.colors.onSurfaceVariant }]}>
          Obrigado por compartilhar um pouco sobre o seu dia.
        </Text>
        <View style={[styles.sucessoCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={[styles.sucessoCardTexto, { color: theme.colors.primary }]}>
            Cada registro é um passo importante para o seu autocuidado.
          </Text>
          <Text style={[styles.sucessoCardSubTexto, { color: theme.colors.onSurfaceVariant }]}>
            Continue acompanhando sua jornada e lembre-se: você não está sozinho.
          </Text>
        </View>
        <View style={{ width: '100%' }}>
          <CustomButton title="Voltar para Home" onPress={() => navigation.navigate('Main')} />
        </View>
      </View>
    </View>
  );

  const renderEtapaAtual = () => {
    switch (etapa) {
      case 1: return renderEtapa1();
      case 2: return renderEtapa2();
      case 3: return renderEtapa3();
      case 4: return renderEtapa4();
      case 5: return renderEtapa5();
      case 6: return renderEtapa6();
      case 7: return renderEtapa7();
      default: return null;
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Check-in Diário</Text>
      </View>

      {/* Progresso */}
      {renderProgresso()}

      {/* Etapa atual */}
      {renderEtapaAtual()}
    </ScrollView>
  );

}
