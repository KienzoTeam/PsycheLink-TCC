import React from 'react';
import { StyleSheet, Text, ActivityIndicator, TextStyle, ViewStyle} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { gradienteMarca } from '../../theme';
import ToqueAnimado from './ToqueAnimado';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function CustomButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: Props) {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          container: { backgroundColor: theme.colors.secondaryContainer },
          text: { color: theme.colors.onSecondaryContainer },
        };
      case 'outline':
        return {
          container: { 
            backgroundColor: 'transparent', 
            borderWidth: 2, 
            borderColor: theme.colors.primary 
          },
          text: { color: theme.colors.primary },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: theme.colors.primary },
        };
      default: // primary
        return {
          container: { backgroundColor: theme.colors.primary },
          text: { color: '#FFFFFF' },
        };
    }
  };

  const variantStyles = getVariantStyles();

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} />
      ) : (
        <Text style={[styles.text, variantStyles.text, textStyle]} maxFontSizeMultiplier={1.4}>
          {title}
        </Text>
      )}
    </>
  );

  if (variant === 'primary') {
    return (
      <ToqueAnimado
        onPress={onPress}
        disabled={loading || disabled}
        preencher
        style={[styles.container, disabled && styles.disabled, style]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: loading || disabled }}
      >
        <LinearGradient
          colors={gradienteMarca}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { borderRadius: theme.borderRadius.xl }]}
        >
          {renderContent()}
        </LinearGradient>
      </ToqueAnimado>
    );
  }

  return (
    <ToqueAnimado
      onPress={onPress}
      disabled={loading || disabled}
      style={[
        styles.container,
        variantStyles.container,
        { borderRadius: theme.borderRadius.xl },
        disabled && styles.disabled,
        style
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: loading || disabled }}
    >
      {renderContent()}
    </ToqueAnimado>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  gradient: {
    flexGrow: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
});
