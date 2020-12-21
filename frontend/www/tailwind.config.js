module.exports = {
  theme: {
    typography: theme => ({
      default: {
        css: {
          fontSize: '1.125rem',
          lineHeight: 1.6,
          color: theme('colors.gray.900'),
          marginTop: 0,
          marginBottom: 0,
          strong: {
            color: theme('colors.gray.900'),
          },
          a: {
            color: theme('colors.blue.700'),
          },
          p: {
            marginTop: 0,
            marginBottom: 0,
          },
        },
      },
      xl: {
        css: {
          lineHeight: 1.6,
          p: {
            marginTop: 0,
            marginBottom: 0,
          },
        },
      },
      '2xl': {
        lineHeight: 1.6,
        css: {
          p: {
            marginTop: 0,
            marginBottom: 0,
          },
        },
      },
      '3xl': {
        lineHeight: 1.6,
        css: {
          p: {
            marginTop: 0,
            marginBottom: 0,
          },
        },
      },
    }),
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
      '3xl': '1920px',
    },
    extend: {
      colors: {
        muted: 'var(--color-muted)',
        'muted-hover': 'var(--color-muted-hover)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        secondary: 'var(--color-secondary)',
        'secondary-hover': 'var(--color-secondary-hover)',
        info: 'var(--color-info)',
        'info-hover': 'var(--color-info-hover)',
        success: 'var(--color-success)',
        'success-hover': 'var(--color-success-hover)',
        'success-background': 'var(--color-success-background)',
        warning: 'var(--color-warning)',
        'warning-hover': 'var(--color-warning-hover)',
        'warning-background': 'var(--color-warning-background)',
        danger: 'var(--color-danger)',
        'danger-hover': 'var(--color-danger-hover)',
        'danger-background': 'var(--color-danger-background)',
        background: 'var(--color-background)',
        'background-muted': 'var(--color-background-muted)',
        'background-emphasize': 'var(--color-background-emphasize)',
        'background-toolbar': 'var(--color-background-toolbar)',
        heading: 'var(--color-heading)',
        'heading-muted': 'var(--color-heading-muted)',
        body: 'var(--color-body)',
        'body-muted': 'var(--color-body-muted)',
        'toggle-theme': 'var(--color-toggle-theme)',
        toolbar: 'var(--color-toolbar)',
        'toolbar-active': 'var(--color-toolbar-active)',
        'brand-primary': 'var(--color-brand-primary)',
        'brand-secondary': 'var(--color-brand-secondary)',
      },
      gridTemplateColumns: {
        'document-grid': 'repeat(auto-fill, minmax(300px, 1fr))',
      },
    },
  },
  variants: [
    'responsive',
    'group-hover',
    'group-focus',
    'focus-within',
    'first',
    'last',
    'odd',
    'even',
    'hover',
    'focus',
    'active',
    'visited',
    'disabled',
  ],
  plugins: [require('@tailwindcss/typography')],
  purge: {
    mode: 'all',
    content: [
      ...['components', 'pages', 'screens', 'shared'].map(
        folder => `./${folder}/**/*.tsx`,
      ),
      '../packages/editor/**/*.tsx',
    ],
  },
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
}
