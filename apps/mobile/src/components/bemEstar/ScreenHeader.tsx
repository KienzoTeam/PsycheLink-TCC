import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { styles } from '../../screens/paciente/BemEstar/StyleBemEstar';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
}

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.outline },
      ]}
    >
      <TouchableOpacity
        style={styles.headerButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Voltar para o início"
      >
        <Feather name="arrow-left" size={22} color={theme.colors.onBackground} />
      </TouchableOpacity>

      <Text
        style={[styles.headerTitle, { color: theme.colors.onBackground }]}
        maxFontSizeMultiplier={1.2}
      >
        {title}
      </Text>

      <View style={styles.headerSpacer} />
    </View>
  );
}

export default ScreenHeader;
