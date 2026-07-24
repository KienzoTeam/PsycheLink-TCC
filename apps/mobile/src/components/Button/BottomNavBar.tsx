import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  navigation: any;
  telaAtual: string;
}

type FeatherIconName = 'home' | 'heart' | 'bar-chart-2' | 'clipboard' | 'message-circle' | 'star' | 'alert-circle';

const itens: { nome: string; label: string; icone: FeatherIconName }[] = [
  { nome: 'Home',     label: 'Início',    icone: 'home' },
  { nome: 'Checkin',  label: 'Check-in',  icone: 'heart' },
  { nome: 'Dados',    label: 'Dados',     icone: 'bar-chart-2' },
  { nome: 'Escalas',  label: 'Escalas',   icone: 'clipboard' },
  { nome: 'Chat',     label: 'Chat',      icone: 'message-circle' },
  { nome: 'BemEstar', label: 'Bem-estar', icone: 'star' },
  { nome: 'SOS',      label: 'SOS',       icone: 'alert-circle' },
];

export default function BottomNavBar({ navigation, telaAtual }: Props) {
  return (
    <View style={styles.container}>
      {itens.map(item => {
        const ativo = telaAtual === item.nome;
        return (
          <TouchableOpacity
            key={item.nome}
            style={styles.item}
            onPress={() => navigation.navigate(item.nome)}
          >
            <View style={[styles.iconContainer, ativo && styles.iconContainerAtivo]}>
              <Feather
                name={item.icone}
                size={22}
                color={ativo ? '#8839ef' : '#9ca0b0'}
              />
            </View>
            <Text style={[styles.label, ativo && styles.labelAtivo]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#e6e9ef',
    shadowColor: '#8839ef',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerAtivo: {
    backgroundColor: '#e6e9ef',
  },
  label: {
    fontSize: 11,
    color: '#9ca0b0',
    fontWeight: '500',
  },
  labelAtivo: {
    color: '#8839ef',
    fontWeight: '700',
  },
});
