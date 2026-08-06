import React from 'react';
import {
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  View,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props extends TextInputProps {
  label: string;
  errorMessage?: string;
  helperText?: string;
}

export default function CustomInput({
  label,
  style,
  errorMessage,
  helperText,
  ...rest
}: Props) {
  const { theme } = useTheme();
  const message = errorMessage ?? helperText;
  const messageColor = errorMessage ? '#B3261E' : theme.colors.onSurfaceVariant;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.onSurface }]}>{label}</Text>
      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.onSurface,
            borderColor: errorMessage ? '#B3261E' : theme.colors.outline,
            borderRadius: theme.borderRadius.lg,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        accessibilityHint={errorMessage}
        {...rest}
      />
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.message, { color: messageColor }]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginLeft: 4,
  },
});
