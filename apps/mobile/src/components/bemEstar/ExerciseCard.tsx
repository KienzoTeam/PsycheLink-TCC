import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeContext';
import { styles } from '../../screens/paciente/BemEstar/StyleBemEstar';
import { CardVariant, FeatherIcon } from '../../constants/types';

interface ExerciseCardProps {
  title: string;
  description: string;
  icon: FeatherIcon;
  variant?: CardVariant;
  duration?: string;
  compact?: boolean;
  onPress: () => void;
}

export function ExerciseCard({
  title,
  description,
  icon,
  variant = 'primary',
  duration,
  compact = false,
  onPress,
}: ExerciseCardProps) {
  const { theme } = useTheme();

  const iconColor =
    variant === 'secondary'
      ? theme.colors.secondary
      : variant === 'tertiary'
        ? theme.colors.tertiary
        : theme.colors.primary;

  const iconBackground =
    variant === 'secondary'
      ? theme.colors.secondaryContainer
      : variant === 'tertiary'
        ? theme.colors.tertiaryContainer
        : theme.colors.primaryContainer;

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.guidedCard,
          {
            backgroundColor: theme.colors.surfaceContainer,
            borderColor: theme.colors.outline,
          },
        ]}
        activeOpacity={0.8}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${description}`}
      >
        <View style={[styles.guidedIcon, { backgroundColor: iconBackground }]}>
          <Feather name={icon} size={22} color={iconColor} />
        </View>

        <View style={styles.guidedInformation}>
          <Text
            style={[styles.guidedTitle, { color: theme.colors.onSurface }]}
            maxFontSizeMultiplier={1.3}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.guidedDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {description}
          </Text>
        </View>

        {duration && (
          <View
            style={[
              styles.durationBadge,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Feather name="clock" size={12} color={theme.colors.primary} />

            <Text
              style={[styles.durationText, { color: theme.colors.primary }]}
              maxFontSizeMultiplier={1.2}
            >
              {duration}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.exerciseCard,
        {
          backgroundColor: theme.colors.surfaceContainer,
          borderColor: theme.colors.outline,
        },
      ]}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
    >
      <View style={[styles.exerciseIcon, { backgroundColor: iconBackground }]}>
        <Feather name={icon} size={24} color={iconColor} />
      </View>

      <View style={styles.exerciseCardContent}>
        <Text
          style={[styles.exerciseCardTitle, { color: theme.colors.onSurface }]}
          maxFontSizeMultiplier={1.25}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.exerciseCardDescription,
            { color: theme.colors.onSurfaceVariant },
          ]}
          maxFontSizeMultiplier={1.25}
        >
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default ExerciseCard;
