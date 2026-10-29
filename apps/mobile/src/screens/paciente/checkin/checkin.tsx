import React, { useEffect, useRef, useState } from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Alert, PanResponder, KeyboardAvoidingView, Platform, ViewInstance} from 'react-native';
import Animated, { SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight, FadeInDown, FadeInUp, ZoomIn, useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import CustomButton from '../../../components/ui/CustomButton';
import ToqueAnimado from '../../../components/ui/ToqueAnimado';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { styles } from './styleCheckin';
import { salvarRascunho, lerRascunho, resetarRascunho } from '../../../lib/rascunhoCheckin';
import { vibrarLeve } from '../../../lib/hapticos';
import SeloDemonstracao from '../../../components/ui/SeloDemonstracao';
import { buscarDiarioPadrao, enviarCheckin } from '../../../lib/checkinService';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkin'>;

const total_etapas = 7;

type RascunhoCheckin = {
  etapa: number;
  emocoes: string[];
  intensidade: number;
  humor: number;
  ansiedade: number;
  horasSono: number;
  qualidadeSono: string | null;
  contextos: string[];
  habitos: string[];
  notas: string;
};

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
  { id: 'saude', label: 'Saúde', icone: 'thermometer' },
  { id: 'financas', label: 'Finanças', icone: 'dollar-sign' },
];

const habitos = [
  { id: 'hidratacao', label: 'Hidratação', icone: 'droplet' },
  { id: 'exercicio', label: 'Exercício', icone: 'activity' },
  { id: 'meditacao', label: 'Meditação', icone: 'wind' },
  { id: 'telas', label: 'Tempo de telas', icone: 'smartphone' },
  { id: 'social', label: 'Contato social', icone: 'users' },
];

function SliderControl({
  label,
  value,
  onChange,
  max,
  formato,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  formato?: (v: number) => string;
}) {
  const { theme } = useTheme();
  const trackRef = useRef<ViewInstance>(null);
  const trackGeo = useRef({ x: 0, width: 1 });
  
  // Espelho do valor: o PanResponder captura aplicar na criação, então
  // comparações precisam ler o valor atual por ref (não por closure).
  const valorRef = useRef(value);
  valorRef.current = value;

  // Toda mudança de valor passa por aqui: háptico marca o marco alcançado.
  const mudar = (novo: number) => {
    const clamp = Math.min(max, Math.max(1, novo));
    if (clamp === valorRef.current) return;
    vibrarLeve();
    onChange(clamp);
  };

  // onChange é sempre um setState (identidade estável); seguro capturar no PanResponder.
  const aplicar = (pageX: number) => {
    const { x, width } = trackGeo.current;
    const ratio = Math.min(1, Math.max(0, (pageX - x) / width));
    mudar(Math.round(ratio * max));
  };

  const gesto = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => aplicar(e.nativeEvent.pageX),
      onPanResponderMove: e => aplicar(e.nativeEvent.pageX),
    })
  ).current;

  const medirTrack = () => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      trackGeo.current = { x, width };
    });
  };

  return (
    <View style={styles.sliderItem}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.sliderLabel, { color: theme.colors.onBackground }]}>{label}</Text>
        <Text style={[styles.sliderValue, { color: theme.colors.primary }]}>
          {formato ? formato(value) : `${value}/${max}`}
        </Text>
      </View>
      <View
        ref={trackRef}
        style={styles.sliderHitArea}
        onLayout={medirTrack}
        {...gesto.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 1, max, now: value, text: formato ? formato(value) : `${value} de ${max}` }}
        accessibilityActions={[
          { name: 'increment', label: 'Aumentar' },
          { name: 'decrement', label: 'Diminuir' },
        ]}
        onAccessibilityAction={e => {
          const passo = e.nativeEvent.actionName === 'increment' ? 1 : -1;
          mudar(value + passo);
        }}
      >
        <View style={[styles.sliderTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View
            style={[
              styles.sliderFill,
              { width: `${(value / max) * 100}%`, backgroundColor: theme.colors.primary },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.sliderThumb,
              {
                left: `${(value / max) * 100}%`,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.primary,
              },
            ]}
          />
        </View>
      </View>
      <View style={styles.sliderEscala}>
        {Array.from({ length: max }, (_, i) => i + 1).map(v => (
          <TouchableOpacity key={v} style={styles.sliderNumeroAlvo} onPress={() => mudar(v)} accessibilityLabel={`${label}: ${v}`}>
            <View
              style={[styles.sliderNumero, v === value && { backgroundColor: theme.colors.primary }]}
              accessibilityState={{ selected: v === value }}
            >
              <Text style={{ fontSize: max > 10 ? 9 : 10, color: v === value ? '#FFF' : theme.colors.onSurfaceVariant }}>
                {v}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function Checkin({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [etapa, setEtapa] = useState(lerRascunho()?.etapa ?? 1);
  const [erroEmocoes, setErroEmocoes] = useState(false);

  // Envio final do check-in pro backend.
  const [enviando, setEnviando] = useState(false);

  // Etapa 1 - Aba de Emoções
  const [emocoesSelecionadas, setEmocoesSelecionadas] = useState<string[]>(lerRascunho()?.emocoes ?? []);

  // Etapa 2 - Intensidade de Humores
  const [intensidade, setIntensidade] = useState(lerRascunho()?.intensidade ?? 5);
  const [humor, setHumor] = useState(lerRascunho()?.humor ?? 5);
  const [ansiedade, setAnsiedade] = useState(lerRascunho()?.ansiedade ?? 5);

  // Etapa 3 - Sono
  const [horasSono, setHorasSono] = useState(lerRascunho()?.horasSono ?? 7);
  const [qualidadeSono, setQualidadeSono] = useState<string | null>(lerRascunho()?.qualidadeSono ?? null);

  // Etapa 4 - Contextos (possiveis gatilhos)
  const [contextosSelecionados, setContextosSelecionados] = useState<string[]>(lerRascunho()?.contextos ?? []);

  // Etapa 5 - Hábitos 
  const [habitosSelecionados, setHabitosSelecionados] = useState<string[]>(lerRascunho()?.habitos ?? []);

  // Etapa 6 - Diário Emocional
  const [notas, setNotas] = useState(lerRascunho()?.notas ?? '');
  const [diarioCompartilhado, setDiarioCompartilhado] = useState(lerRascunho()?.diarioCompartilhado ?? false);
  const [rascunhoTemDiario] = useState(lerRascunho()?.diarioCompartilhado !== undefined);
  const diarioTocado = useRef(false);

  // O valor do rascunho manda; sem ele, o interruptor começa pela preferência do paciente.
  // Se a busca falhar, continua desmarcado. Se ela chegar depois de o paciente mexer no
  // interruptor, a escolha dele vale.
  useEffect(() => {
    if (rascunhoTemDiario) return;
    buscarDiarioPadrao().then((padrao) => {
      if (!diarioTocado.current) setDiarioCompartilhado(padrao);
    }, () => {});
  }, [rascunhoTemDiario]);

  // Espelha o rascunho nos estados que o compõem: interrupção (background/kill)
  // retoma de onde parou. Com deps, não roda em renders alheios (ex.: erro de etapa).
  useEffect(() => {
    salvarRascunho({ etapa, emocoes: emocoesSelecionadas, intensidade, humor, ansiedade, horasSono, qualidadeSono, contextos: contextosSelecionados, habitos: habitosSelecionados, notas, diarioCompartilhado });
  }, [etapa, emocoesSelecionadas, intensidade, humor, ansiedade, horasSono, qualidadeSono, contextosSelecionados, habitosSelecionados, notas, diarioCompartilhado]);

  const progresso = (etapa / total_etapas) * 100;

  // Direção da transição entre etapas (define de que lado a nova entra).
  const [direcao, setDirecao] = useState<'frente' | 'tras'>('frente');

  const toggleItem = (
    id: string,
    lista: string[],
    setLista: (l: string[]) => void
  ) => {
    vibrarLeve();
    if (lista.includes(id)) {
      setLista(lista.filter(i => i !== id));
    } else {
      setLista([...lista, id]);
      setErroEmocoes(false);
    }
  };

  const proximaEtapa = () => {
    if (etapa === 1 && emocoesSelecionadas.length === 0) {
      setErroEmocoes(true);
      return;
    }
    if (etapa < total_etapas) {
      setDirecao('frente');
      vibrarLeve();
      setEtapa(etapa + 1);
    }
  };

  const etapaAnterior = () => {
    if (etapa > 1) {
      setDirecao('tras');
      vibrarLeve();
      setEtapa(etapa - 1);
    }
  };

  // Etapa 6 e 7: em vez de só avançar, manda o check-in pro backend de verdade.
  
  const finalizarCheckin = async () => {
    if (enviando) return;

    setEnviando(true);

    try {
      await enviarCheckin({
        etapa,
        emocoes: emocoesSelecionadas,
        intensidade,
        humor,
        ansiedade,
        horasSono,
        qualidadeSono,
        contextos: contextosSelecionados,
        habitos: habitosSelecionados,
        notas,
        diarioCompartilhado,
      });

      resetarRascunho();
      setDirecao('frente');
      setEtapa(total_etapas); // vai direto pra etapa 7 (sucesso)
    } catch (error: any) {
      Alert.alert(
        'Não foi possível salvar',
        error.response?.data?.error ||
          'Verifique sua internet e tente novamente.',
      );
    } finally {
      setEnviando(false);
    }
  };

  const gestoSwipe = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-10, 10])
    .onEnd(e => {
      const avancou = e.translationX < -48 && e.velocityX < -150;
      const voltou = e.translationX > 48 && e.velocityX > 150;
      if (avancou) runOnJS(proximaEtapa)();
      else if (voltou) runOnJS(etapaAnterior)();
    });

  const progressoAnim = useSharedValue((etapa / total_etapas) * 100);
  useEffect(() => {
    progressoAnim.value = withSpring(progresso, { damping: 20, stiffness: 160 });
  }, [progresso, progressoAnim]);
  const estiloProgresso = useAnimatedStyle(() => ({ width: `${progressoAnim.value}%` }));

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
        <Animated.View style={[styles.progressFill, estiloProgresso, { backgroundColor: theme.colors.primary }]} />
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
            <ToqueAnimado
              key={e.id}
              style={[
                styles.emocaoItem,
                {
                  borderColor: selecionado ? theme.colors.primary : theme.colors.outline,
                  backgroundColor: selecionado ? theme.colors.primaryContainer : theme.colors.surface,
                }
              ]}
              onPress={() => toggleItem(e.id, emocoesSelecionadas, setEmocoesSelecionadas)}
              accessibilityRole="button"
              accessibilityState={{ selected: selecionado }}
            >
              <Feather
                name={e.icone as any}
                size={28}
                color={selecionado ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.emocaoLabel, { color: selecionado ? theme.colors.onPrimaryContainer : theme.colors.onBackground }]}>
                {e.label}
              </Text>
            </ToqueAnimado>
          );
        })}
      </View>
      {erroEmocoes && (
        <Text style={[styles.hintErro, { color: theme.colors.error }]} accessibilityRole="alert">
          Escolha pelo menos uma emoção para continuar.
        </Text>
      )}
      <View style={styles.footerSingle}>
        <CustomButton title="Próximo" onPress={proximaEtapa} />
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
        <SliderControl label="Intensidade Emocional" value={intensidade} onChange={setIntensidade} max={10} />
        <SliderControl label="Humor Geral" value={humor} onChange={setHumor} max={10} />
        <SliderControl label="Ansiedade Percebida" value={ansiedade} onChange={setAnsiedade} max={10} />
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btnVoltar, { borderColor: theme.colors.outline }]} onPress={etapaAnterior}>
          <Text style={[styles.btnVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <CustomButton title="Próximo" onPress={proximaEtapa} />
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
        <SliderControl label="Horas Dormidas" value={horasSono} onChange={setHorasSono} max={12} formato={v => `${v}h`} />

        <View>
          <Text style={[styles.sliderLabel, { color: theme.colors.onBackground, marginBottom: 10 }]}>Qualidade do Sono</Text>
          <View style={styles.qualidadeContainer}>
            {['Ruim', 'Regular', 'Boa'].map(q => (
              <ToqueAnimado
                key={q}
                style={[
                  styles.qualidadeBtn,
                  {
                    borderColor: qualidadeSono === q ? theme.colors.primary : theme.colors.outline,
                    backgroundColor: qualidadeSono === q ? theme.colors.primaryContainer : 'transparent',
                  }
                ]}
                onPress={() => {
                  setQualidadeSono(q);
                  vibrarLeve();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: qualidadeSono === q }}
              >
                <Text style={[styles.qualidadeText, { color: qualidadeSono === q ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }]}>
                  {q}
                </Text>
              </ToqueAnimado>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btnVoltar, { borderColor: theme.colors.outline }]} onPress={etapaAnterior}>
          <Text style={[styles.btnVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <CustomButton title="Próximo" onPress={proximaEtapa} />
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
            <ToqueAnimado
              key={c.id}
              style={[
                styles.contextoItem,
                {
                  borderColor: selecionado ? theme.colors.primary : theme.colors.outline,
                  backgroundColor: selecionado ? theme.colors.primaryContainer : theme.colors.surface,
                }
              ]}
              onPress={() => toggleItem(c.id, contextosSelecionados, setContextosSelecionados)}
              accessibilityRole="button"
              accessibilityState={{ selected: selecionado }}
            >
              <Feather
                name={c.icone as any}
                size={28}
                color={selecionado ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.contextoLabel, { color: selecionado ? theme.colors.onPrimaryContainer : theme.colors.onBackground }]}>
                {c.label}
              </Text>
            </ToqueAnimado>
          );
        })}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btnVoltar, { borderColor: theme.colors.outline }]} onPress={etapaAnterior}>
          <Text style={[styles.btnVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <CustomButton title="Próximo" onPress={proximaEtapa} />
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
            <ToqueAnimado
              key={h.id}
              style={[
                styles.habitoItem,
                {
                  borderColor: selecionado ? theme.colors.primary : theme.colors.outline,
                  backgroundColor: selecionado ? theme.colors.primaryContainer : theme.colors.surface,
                }
              ]}
              onPress={() => toggleItem(h.id, habitosSelecionados, setHabitosSelecionados)}
              accessibilityRole="button"
              accessibilityState={{ selected: selecionado }}
            >
              <View style={[styles.habitoIconContainer, { backgroundColor: selecionado ? theme.colors.primary : theme.colors.surfaceVariant }]}>
                <Feather
                  name={h.icone as any}
                  size={20}
                  color={selecionado ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                />
              </View>
              <Text style={[styles.habitoLabel, { color: selecionado ? theme.colors.onPrimaryContainer : theme.colors.onBackground }]}>
                {h.label}
              </Text>
              {selecionado && <Feather name="check" size={18} color={theme.colors.primary} />}
            </ToqueAnimado>
          );
        })}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btnVoltar, { borderColor: theme.colors.outline }]} onPress={etapaAnterior}>
          <Text style={[styles.btnVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <CustomButton title="Próximo" onPress={proximaEtapa} />
        </View>
      </View>
    </View>
  );

  const renderEtapa6 = () => {
  const nomesEmocoes = emocoes
    .filter(e => emocoesSelecionadas.includes(e.id))
    .map(e => e.label);
  const contextosHoje = contextos
    .filter(c => contextosSelecionados.includes(c.id))
    .map(c => c.label);
  const habitosHoje = habitos
    .filter(h => habitosSelecionados.includes(h.id))
    .map(h => h.label);

  const linhasResumo = [
    { rotulo: 'Emoções', valor: nomesEmocoes.join(', ') || 'Nenhuma selecionada' },
    { rotulo: 'Sono', valor: `${horasSono}h · qualidade ${qualidadeSono?.toLowerCase() ?? 'não avaliada'}` },
    { rotulo: 'Contextos', valor: contextosHoje.join(', ') || 'Nenhum marcado' },
    { rotulo: 'Hábitos', valor: habitosHoje.join(', ') || 'Nenhum marcado' },
  ];

  return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
  <View style={styles.content}>
    <Text style={[styles.title, { color: theme.colors.onBackground }]}>Algo mais a compartilhar?</Text>
    <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
      Escreva como você se sente (opcional)
    </Text>
    <View style={[styles.recapCard, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.recapTitulo, { color: theme.colors.onSurfaceVariant }]}>Resumo do seu dia</Text>
      {linhasResumo.map(linha => (
        <View key={linha.rotulo} style={styles.recapLinha}>
          <Text style={[styles.recapRotulo, { color: theme.colors.onSurfaceVariant }]}>{linha.rotulo}</Text>
          <Text style={[styles.recapValor, { color: theme.colors.onSurface }]} numberOfLines={2}>
            {linha.valor}
          </Text>
        </View>
      ))}
    </View>
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
    {notas.trim() !== '' && (
      <View style={[styles.diarioLinha, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <View style={styles.diarioTextos} aria-hidden>
          <Text style={[styles.diarioRotulo, { color: theme.colors.onSurface }]}>
            Compartilhar este texto com meu psicólogo
          </Text>
          <Text style={[styles.diarioDescricao, { color: theme.colors.subtext1 }]}>
            Se você tiver um psicólogo vinculado, ele vê só este texto. Você pode parar de compartilhar em Psicólogo e privacidade.
          </Text>
        </View>
        <Switch
          value={diarioCompartilhado}
          onValueChange={(valor) => {
            diarioTocado.current = true;
            setDiarioCompartilhado(valor);
          }}
          trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
          ios_backgroundColor={theme.colors.surfaceVariant}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Compartilhar este texto com meu psicólogo"
          accessibilityHint="Se você tiver um psicólogo vinculado, ele vê só este texto"
          accessibilityState={{ checked: diarioCompartilhado }}
        />
      </View>
    )}
    <View style={[styles.privacidadeBox, { backgroundColor: theme.colors.primaryContainer }]}>
      <Feather name="lock" size={16} color={theme.colors.onPrimaryContainer} />
      <Text style={[styles.privacidadeTexto, { color: theme.colors.onPrimaryContainer }]}>
        Seus registros são privados e compartilhados apenas com seu psicólogo vinculado.
      </Text>
    </View>
    <View style={styles.footer}>
      <TouchableOpacity style={[styles.btnVoltar, { borderColor: theme.colors.outline }]} onPress={etapaAnterior}>
        <Text style={[styles.btnVoltarTexto, { color: theme.colors.onBackground }]}>Voltar</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <CustomButton
          title={enviando ? 'Salvando...' : '✓ Salvar Registro'}
          onPress={finalizarCheckin}
        />
      </View>
    </View>
  </View>
  </KeyboardAvoidingView>
  );
};

  const renderEtapa7 = () => (
    <View style={styles.content}>
      <View style={styles.sucessoContainer}>
        <Animated.View
          style={[styles.sucessoIconContainer, { backgroundColor: theme.colors.primaryContainer }]}
          entering={ZoomIn.springify().damping(12)}
        >
          <Feather name="check" size={36} color={theme.colors.primary} />
        </Animated.View>
        <Animated.Text
          style={[styles.title, { color: theme.colors.onBackground, textAlign: 'center' }]}
          entering={FadeInDown.delay(140)}
        >
          💜 Check-in concluído
        </Animated.Text>
        <Animated.View entering={FadeInDown.delay(200)} style={{ alignSelf: 'center' }}>
          <SeloDemonstracao />
        </Animated.View>
        <Animated.Text
          style={[styles.sucessoSubtitulo, { color: theme.colors.onSurfaceVariant }]}
          entering={FadeInDown.delay(260)}
        >
          Obrigado por compartilhar um pouco sobre o seu dia.
        </Animated.Text>
        <Animated.View
          style={[styles.sucessoCard, { backgroundColor: theme.colors.primaryContainer }]}
          entering={FadeInUp.delay(340)}
        >
          <Text style={[styles.sucessoCardTexto, { color: theme.colors.onPrimaryContainer }]}>
            Cada registro é um passo importante para o seu autocuidado.
          </Text>
          <Text style={[styles.sucessoCardSubTexto, { color: theme.colors.onSurfaceVariant }]}>
            Continue acompanhando sua jornada e lembre-se: você não está sozinho.
          </Text>
          <Text style={[styles.sucessoCardSubTexto, { color: theme.colors.onSurfaceVariant, marginTop: 8 }]}>
            Seu registro de hoje foi salvo.
          </Text>
        </Animated.View>
        <Animated.View style={{ width: '100%' }} entering={FadeInDown.delay(440)}>
          <CustomButton
            title="Voltar para Home"
            onPress={() => {
              resetarRascunho();
              navigation.popTo('Main');
            }}
          />
        </Animated.View>
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
     
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            if (etapa > 1) {
              Alert.alert(
                'Descartar check-in?',
                'Seu registro deste dia ainda não foi concluído.',
                [
                  { text: 'Continuar editando', style: 'cancel' },
                  {
                    text: 'Descartar',
                    style: 'destructive',
                    onPress: () => {
                      resetarRascunho();
                      navigation.goBack();
                    },
                  },
                ]
              );
              return;
            }
            resetarRascunho();
            navigation.goBack();
          }}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Check-in Diário</Text>
      </View>

     
      {renderProgresso()}

     
      <GestureDetector gesture={gestoSwipe}>
        <Animated.View
          key={etapa}
          entering={direcao === 'frente' ? SlideInRight : SlideInLeft}
          exiting={direcao === 'frente' ? SlideOutLeft : SlideOutRight}
        >
          {renderEtapaAtual()}
        </Animated.View>
      </GestureDetector>
    </ScrollView>
  );

}
