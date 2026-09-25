import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeContext';
import { styles } from '../../screens/paciente/BemEstar/StyleBemEstar';

interface DailyTipCardProps {
  tip: string;
}

export function DailyTipCard({ tip }: DailyTipCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.tipCard,
        { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary },
      ]}
    >
      <View style={styles.tipCardHeader}>
        <View style={[styles.tipIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <Feather name="star" size={19} color={theme.colors.primary} />
        </View>

        <View style={styles.tipTextContainer}>
          <Text
            style={[styles.tipTitle, { color: theme.colors.onPrimary }]}
            maxFontSizeMultiplier={1.2}
          >
            Dica do dia
          </Text>

          <Text
            style={[styles.tipDescription, { color: theme.colors.onPrimary }]}
            maxFontSizeMultiplier={1.2}
          >
            {tip}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default DailyTipCard;
