import React from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';

interface Props {
  tamanho?: 'pequeno' | 'medio' | 'grande';
  source: ImageSourcePropType;
}

export default function AppLogo({ tamanho = 'medio', source }: Props) {
  const tamanhos = {
    pequeno: { logo: 60, fonte: 20 },
    medio:   { logo: 80, fonte: 24 },
    grande:  { logo: 120, fonte: 28 },
  };

  const { logo, fonte } = tamanhos[tamanho];

  return (
    <View style={styles.container}>
      <Image
        source={source}
        style={{ width: logo, height: logo }}
        resizeMode="contain"
      />
      <Text style={[styles.texto, { fontSize: fonte }]}>PsycheLink</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },
  texto: {
    textAlign: 'center',
    color: '#2D2154',
    fontWeight: '600',
    marginTop: 8,
  },
});