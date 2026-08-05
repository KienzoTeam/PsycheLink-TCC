/**
 * Catppuccin Palette definitions
 * Latte (Light) and Mocha (Dark)
 */
export const palette = {
  latte: {
    rosewater: '#dc8a78',
    flamingo: '#dd7878',
    pink: '#ea76cb',
    mauve: '#8839ef',
    red: '#d20f39',
    maroon: '#e64553',
    peach: '#fe640b',
    yellow: '#df8e1d',
    green: '#40a02b',
    teal: '#179287',
    sky: '#04a5e5',
    sapphire: '#209fb5',
    blue: '#1e66f5',
    lavender: '#7287fd',
    text: '#4c4f69',
    subtext1: '#5c5f77',
    subtext0: '#6c6f85',
    overlay2: '#7c7f93',
    overlay1: '#8c8fa1',
    overlay0: '#9ca0b0',
    surface2: '#acb0be',
    surface1: '#bcc0cc',
    surface0: '#ccd0da',
    base: '#eff1f5',
    mantle: '#e6e9ef',
    crust: '#dce0e8',
  },
  mocha: {
    rosewater: '#f5e0dc',
    flamingo: '#f2cdcd',
    pink: '#f5c2e7',
    mauve: '#cba6f7',
    red: '#f38ba8',
    maroon: '#eba0ac',
    peach: '#fab387',
    yellow: '#f9e2af',
    green: '#a6e3a1',
    teal: '#94e2d5',
    sky: '#89dceb',
    sapphire: '#74c7ec',
    blue: '#89b4fa',
    lavender: '#b4befe',
    text: '#cdd6f4',
    subtext1: '#bac2de',
    subtext0: '#a6adc8',
    overlay2: '#9399b2',
    overlay1: '#7f849c',
    overlay0: '#6c7086',
    surface2: '#585b70',
    surface1: '#45475a',
    surface0: '#313244',
    base: '#1e1e2e',
    mantle: '#181825',
    crust: '#11111b',
  },
};

/**
 * Material Expressive 3 inspired theme structure
 */
export const theme = {
  light: {
    colors: {
      primary: palette.latte.mauve,
      onPrimary: '#ffffff',
      primaryContainer: '#f5eaff', // Lighter mauve
      onPrimaryContainer: '#21005d',
      
      secondary: palette.latte.lavender,
      onSecondary: '#ffffff',
      secondaryContainer: '#e8eaff',
      onSecondaryContainer: '#001d35',
      
      tertiary: palette.latte.teal,
      onTertiary: '#ffffff',
      tertiaryContainer: '#c6fff8',
      onTertiaryContainer: '#00201d',

      error: palette.latte.red,
      onError: '#ffffff',
      
      background: palette.latte.base,
      onBackground: palette.latte.text,
      
      surface: palette.latte.mantle,
      onSurface: palette.latte.text,
      surfaceVariant: palette.latte.surface0,
      onSurfaceVariant: palette.latte.subtext0,
      
      outline: palette.latte.surface1,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 28, // Expressive 3 often uses very rounded corners
      full: 999,
    }
  },
  dark: {
    colors: {
      primary: palette.mocha.mauve,
      onPrimary: '#4a0080',
      primaryContainer: '#663399',
      onPrimaryContainer: palette.mocha.rosewater,
      
      secondary: palette.mocha.lavender,
      onSecondary: '#1e285a',
      secondaryContainer: '#373f77',
      onSecondaryContainer: palette.mocha.blue,
      
      tertiary: palette.mocha.teal,
      onTertiary: '#003733',
      tertiaryContainer: '#00504b',
      onTertiaryContainer: palette.mocha.green,

      error: palette.mocha.red,
      onError: '#690005',
      
      background: palette.mocha.base,
      onBackground: palette.mocha.text,
      
      surface: palette.mocha.mantle,
      onSurface: palette.mocha.text,
      surfaceVariant: palette.mocha.surface0,
      onSurfaceVariant: palette.mocha.subtext0,
      
      outline: palette.mocha.surface1,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 28,
      full: 999,
    }
  }
};

export type AppTheme = typeof theme.light;
