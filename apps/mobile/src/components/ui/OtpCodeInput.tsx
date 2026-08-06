import React, { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  value: string[];
  onChange: (code: string[]) => void;
};

function asciiDigits(value: string): string[] {
  return Array.from(value).filter((character) => character >= '0' && character <= '9');
}

export default function OtpCodeInput({ value, onChange }: Props) {
  const { theme } = useTheme();
  const inputs = useRef<(TextInput | null)[]>([]);

  const updateCode = (text: string, index: number) => {
    const digits = asciiDigits(text);
    const next = [...value];

    if (digits.length === 0) {
      next[index] = '';
      onChange(next);
      return;
    }

    digits.forEach((digit, offset) => {
      if (index + offset < next.length) {
        next[index + offset] = digit;
      }
    });
    onChange(next);

    const nextIndex = Math.min(index + digits.length, next.length - 1);
    if (nextIndex > index) {
      inputs.current[nextIndex]?.focus();
    }
  };

  return (
    <View style={styles.container} accessibilityLabel="Código de verificação de seis dígitos">
      {value.map((digit, index) => (
        <TextInput
          key={index}
          ref={(reference) => {
            inputs.current[index] = reference;
          }}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: digit ? theme.colors.primary : theme.colors.outline,
              color: theme.colors.onSurface,
            },
          ]}
          accessibilityLabel={`Dígito ${index + 1} de 6`}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={6}
          value={digit}
          onChangeText={(text) => updateCode(text, index)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
              inputs.current[index - 1]?.focus();
            }
          }}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          importantForAutofill="yes"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 32,
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
