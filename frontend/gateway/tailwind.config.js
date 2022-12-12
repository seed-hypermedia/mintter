const Gray = {
  '--gray-0': '#f8f9fa',
  '--gray-1': '#f1f3f5',
  '--gray-2': '#e9ecef',
  '--gray-3': '#dee2e6',
  '--gray-4': '#ced4da',
  '--gray-5': '#adb5bd',
  '--gray-6': '#868e96',
  '--gray-7': '#495057',
  '--gray-8': '#343a40',
  '--gray-9': '#212529',
  '--gray-10': '#16191d',
  '--gray-11': '#0d0f12',
  '--gray-12': '#030507',
}

const Blue = {
  '--blue-0': '#e7f5ff',
  '--blue-1': '#d0ebff',
  '--blue-2': '#a5d8ff',
  '--blue-3': '#74c0fc',
  '--blue-4': '#4dabf7',
  '--blue-5': '#339af0',
  '--blue-6': '#228be6',
  '--blue-7': '#1c7ed6',
  '--blue-8': '#1971c2',
  '--blue-9': '#1864ab',
  '--blue-10': '#145591',
  '--blue-11': '#114678',
  '--blue-12': '#0d375e',
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{tsx,mdx}",],
  darkMode: 'media',
  presets: [],
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px'
    },
    colors: {
      brand: '#3B00FF',
      'light-text-100': Gray['--gray-9'],
      'light-text-200': Gray['--gray-10'],
      'light-text-300': Gray['--gray-11'],
      'light-surface-100': Gray['--gray-2'],
      'light-surface-200': Gray['--gray-3'],
      'light-surface-300': Gray['--gray-4'],
      'light-surface-400': Gray['--gray-5'],
      
      'dark-text-100': Gray['--gray-4'],
      'dark-text-200': Gray['--gray-3'],
      'dark-text-300': Gray['--gray-2'],
      'dark-surface-100': Gray['--gray-11'],
      'dark-surface-200': Gray['--gray-10'],
      'dark-surface-300': Gray['--gray-9'],
      'dark-surface-400': Gray['--gray-8'],
    },
    backgroundColor: ({theme}) => theme('colors'),
    spacing: {
      'size-0': 'clamp(0.83rem, 0.90rem + -0.32vw, 0.67rem)',
      'base': 'clamp(1.00rem, 1.00rem + 0.00vw, 1.00rem)',
      'size-1': 'clamp(1.20rem, 1.08rem + 0.59vw, 1.50rem)',
      'size-2': 'clamp(1.44rem, 1.12rem + 1.58vw, 2.25rem)',
      'size-3': 'clamp(1.73rem, 1.09rem + 3.21vw, 3.38rem)',
      'size-4': 'clamp(2.07rem, 0.91rem + 5.83vw, 5.06rem)',
      'size-5': 'clamp(2.49rem, 0.50rem + 9.96vw, 7.59rem)'
    },
    fontSize: {
      'size-0': 'clamp(0.83rem, 0.90rem + -0.32vw, 0.67rem)',
      'base': 'clamp(1.00rem, 1.00rem + 0.00vw, 1.00rem)',
      'size-1': 'clamp(1.20rem, 1.08rem + 0.59vw, 1.50rem)',
      'size-2': 'clamp(1.44rem, 1.12rem + 1.58vw, 2.25rem)',
      'size-3': 'clamp(1.73rem, 1.09rem + 3.21vw, 3.38rem)',
      'size-4': 'clamp(2.07rem, 0.91rem + 5.83vw, 5.06rem)',
      'size-5': 'clamp(2.49rem, 0.50rem + 9.96vw, 7.59rem)'
    },
    fontFamily: {
      sans: ['"Inter"', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif']
    },
    gap: ({theme}) => theme('spacing'),
    margin: ({theme}) => ({
      auto: 'auto',
      ...theme('spacing')
    }),
    scrollMargin: ({theme}) => ({
      ...theme('spacing')
    }),
    textColor: ({theme}) => theme('colors'),
    zIndex: {
      auto: 'auto',
      0: '0',
      10: '10',
      20: '20',
      30: '30',
      40: '40',
      50: '50',
      max: '9999'
    }
  },
  variantOrder: [
    'first',
    'last',
    'odd',
    'even',
    'visited',
    'checked',
    'empty',
    'read-only',
    'group-hover',
    'group-focus',
    'focus-within',
    'hover',
    'focus',
    'focus-visible',
    'active',
    'disabled'
  ],
  plugins: []
};