import React, { useState } from 'react';
import { 
  TextInput as RNTextInput, 
  Text, 
  StyleSheet, 
  View, 
  TouchableOpacity 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

export default function PasswordInput({
  label,
  placeholder,
  value,
  onChangeText,
}: Props) {
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.onSurface }]}>
        {label}
      </Text>
      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
          borderRadius: theme.borderRadius.lg
        }
      ]}>
        <RNTextInput
          style={[styles.input, { color: theme.colors.onSurface }]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
        />
        <TouchableOpacity 
          style={styles.icon} 
          onPress={() => setVisible(!visible)}
        >
          <Feather 
            name={visible ? 'eye' : 'eye-off'} 
            size={20} 
            color={theme.colors.onSurfaceVariant} 
          />
        </TouchableOpacity>
      </View>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    height: 56,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    height: '100%',
  },
  icon: {
    paddingHorizontal: 16,
  },
});
