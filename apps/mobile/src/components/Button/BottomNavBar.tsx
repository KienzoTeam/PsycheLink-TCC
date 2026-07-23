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
                color={ativo ? '#7B68EE' : '#B8AEDF'}
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
    borderTopColor: '#F0EEFF',
    shadowColor: '#7B68EE',
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
    backgroundColor: '#F0EEFF',
  },
  label: {
    fontSize: 11,
    color: '#B8AEDF',
    fontWeight: '500',
  },
  labelAtivo: {
    color: '#7B68EE',
    fontWeight: '700',
  },
});