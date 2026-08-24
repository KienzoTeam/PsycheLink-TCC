import React from 'react';
import { 
  TextInput as RNTextInput, 
  Text, 
  StyleSheet, 
  View, 
  KeyboardTypeOptions,
  TextInputProps 
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props extends TextInputProps {
  label: string;
}

export default function CustomInput({
  label,
  style,
  ...rest
}: Props) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.onSurface }]}>
        {label}
      </Text>
      <RNTextInput
        style={[
          styles.input, 
          { 
            backgroundColor: theme.colors.surface,
            color: theme.colors.onSurface,
            borderColor: theme.colors.outline,
            borderRadius: theme.borderRadius.lg
          },
          style
        ]}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        accessibilityLabel={label}
        maxFontSizeMultiplier={1.4}
        {...rest}
      />
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
});
