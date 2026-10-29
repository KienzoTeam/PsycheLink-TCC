import React, { useState } from 'react';
import {View, Text, TouchableOpacity, Modal,ScrollView, StyleSheet} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  titulo: string;
  conteudo: string;
  dataAtualizacao?: string;
  aceito: boolean;
  onAceitar: () => void;
}

export default function DocumentItem({ titulo, conteudo, dataAtualizacao, aceito, onAceitar }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisivel, setModalVisivel] = useState(false);

  const handleAceitar = () => {
    onAceitar();
    setModalVisivel(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.item,
          { borderColor: aceito ? theme.colors.tertiary : theme.colors.outline },
          { backgroundColor: aceito ? theme.colors.tertiaryContainer : theme.colors.surface },
        ]}
        onPress={() => setModalVisivel(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${titulo}. ${aceito ? 'Lido e aceito' : 'Toque para ler'}`}
      >
        <View style={[
          styles.iconContainer,
          { backgroundColor: aceito ? theme.colors.background : theme.colors.surfaceVariant }
        ]}>
          <Feather
            name="check-circle"
            size={22}
            color={aceito ? theme.colors.tertiary : theme.colors.onSurfaceVariant}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[
            styles.titulo,
            { color: aceito ? theme.colors.onTertiaryContainer : theme.colors.onBackground }
          ]}>
            {titulo}
          </Text>
          <Text style={[styles.subtitulo, { color: theme.colors.onSurfaceVariant }]}>
            {aceito ? 'Lido e aceito' : 'Toque para ler'}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>

      {/* Translúcido nas duas barras: sem isso, no Android a tela de trás aparece na
          status bar. O inset de baixo tira o botão de sob a barra de navegação. */}
      <Modal
        visible={modalVisivel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisivel(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.surface, paddingBottom: 24 + insets.bottom },
            ]}
          >

            <View style={[styles.handleBar, { backgroundColor: theme.colors.outline }]} />

        
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outline }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Feather name="file-text" size={18} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={[styles.modalTitulo, { color: theme.colors.onBackground }]}>
                    {titulo}
                  </Text>
                  {dataAtualizacao && (
                    <Text style={[styles.modalData, { color: theme.colors.onSurfaceVariant }]}>
                      Última atualização: {dataAtualizacao}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisivel(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Fechar documento"
              >
                <Feather name="x" size={24} color={theme.colors.onBackground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {conteudo.split('\n\n').map((paragrafo, index) => {
                const isTitle = /^\d+\./.test(paragrafo.trim());
                return (
                  <View key={index} style={styles.paragrafoContainer}>
                    {isTitle && (
                      <View style={[styles.tituloBar, { backgroundColor: theme.colors.primary }]} />
                    )}
                    <Text style={[
                      isTitle ? styles.paragrafoTitulo : styles.paragrafoTexto,
                      { color: isTitle ? theme.colors.onBackground : theme.colors.onSurfaceVariant }
                    ]}>
                      {paragrafo.trim()}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.btnAceitar, { backgroundColor: theme.colors.primary }]}
              onPress={handleAceitar}
            >
              <Feather name="check" size={20} color={theme.colors.onPrimary} />
              <Text style={[styles.btnAceitarTexto, { color: theme.colors.onPrimary }]}>Li e compreendi</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titulo: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitulo: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '92%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  modalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalData: {
    fontSize: 12,
    marginTop: 2,
  },
  modalContent: {
    marginBottom: 20,
  },
  paragrafoContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  tituloBar: {
    width: 3,
    borderRadius: 2,
    minHeight: 20,
  },
  paragrafoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    flex: 1,
  },
  paragrafoTexto: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  btnAceitar: {
    borderRadius: 16,
    height: 55,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnAceitarTexto: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    padding: 10,
  },
});