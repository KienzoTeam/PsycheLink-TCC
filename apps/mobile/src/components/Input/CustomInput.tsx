import React from 'react';
import { TextInput as RNTextInput, Text, StyleSheet, View, KeyboardTypeOptions } from 'react-native';

interface Props {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export default function CustomInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: Props) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <RNTextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#a0a0a0"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2154',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    height: 55,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD6FF',
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 4,
  },
});