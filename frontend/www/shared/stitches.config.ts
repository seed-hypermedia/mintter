import {createCss} from '@stitches/react'
import {StitchesCss} from '@stitches/core'
import {darken} from 'polished'
export * from '@stitches/react'

const designSystem = createCss({
  prefix: '',
  theme: {
    colors: {
      text: 'hsl(200, 12%, 5%)',
      textSecondary: 'hsl(0,0%,47%)',
      textPlaceholder: 'hsl(0,0%,73%)',
      muted: '$gray500',
      mutedHover: '$gray700',
      white: 'hsl(0,0%,100%)',
      brandPrimary: 'hsl(254,100%,50%)',
      brandPrimaryHover: darken(0.2, 'hsl(254,100%,50%)'),
      brandSecondary: 'hsl(43,100%,53%)',
      brandSecondaryHover: darken(0.2, 'hsl(43,100%,53%)'),
      brandTerciary: 'hsl(328,83%,48%)',
      brandTerciaryHover: darken(0.2, 'hsl(328,83%,48%)'),
      accentDanger: 'hsl(355,69%,51%)',
      accentDangerHover: darken(0.1, 'hsl(355,69%,51%)'),
      accentSuccess: 'hsl(96,93%,30%)',
      accentSuccessHover: darken(0.1, 'hsl(96,93%,30%)'),
      accentWarning: 'hsl(37,83%,52%)',
      accentWarningHover: darken(0.1, 'hsl(37,83%,52%)'),
      gray100: 'hsl(206,20%,98.8%)',
      gray200: 'hsl(206,14%,96.0%)',
      gray300: 'hsl(206,13%,93.7%)',
      gray400: 'hsl(206,12%,92.0%)',
      gray500: 'hsl(206,12%,89.5%)',
      gray600: 'hsl(206,11%,85.2%)',
      gray700: 'hsl(206,10%,80.0%)',
      gray800: 'hsl(206,6%,56.1%)',
      gray900: 'hsl(206,6%,43.9%)',
    },
    fonts: {
      heading: 'Basier Circle, apple-system, sans-serif',
      paragraphs: 'Lora, serif',
      ui: 'Basier Circle, apple-system, sans-serif',
    },
    fontSizes: {
      1: '12px',
      2: '14px',
      3: '16px',
      4: '20px',
      5: '24px',
      6: '32px',
    },
    space: {
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '32px',
      8: '40px',
      9: '48px',
    },
    sizes: {
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '32px',
      8: '40px',
      9: '48px',
    },
    fontWeights: {
      1: 300,
      2: 400,
      3: 600,
      4: 700,
    },
    lineHeights: {
      1: '24px',
      2: '32px',
    },
    letterSpacings: {},
    borderWidths: {},
    borderStyles: {},
    radii: {
      1: '3px',
      2: '5px',
      3: '7px',
      round: '50%',
      pill: '9999px',
    },
    zIndices: {
      1: '100',
      2: '200',
      3: '300',
      4: '400',
      max: '999',
    },
    shadows: {},

    transitions: {},
  },
  conditions: {
    bp1: '@media (min-width: 520px)',
    bp2: '@media (min-width: 900px)',
    bp3: '@media (min-width: 1200px)',
    bp4: '@media (min-width: 1800px)',
    motion: '@media (prefers-reduced-motion)',
    hover: '@media (hover: hover)',
    dark: '@media (prefers-color-scheme: dark)',
    light: '@media (prefers-color-scheme: light)',
  },
  utils: {
    backgroundHover: () => (value: string) => ({
      '&:hover': {
        backgroundColor: value,
      },
    }),
    p: () => (value: any) => ({
      paddingTop: value,
      paddingBottom: value,
      paddingLeft: value,
      paddingRight: value,
    }),

    px: <T extends {theme: {space: any}}>(_: T) => (
      value: keyof typeof config['theme']['spaces'] | (string & number),
    ) => ({
      paddingLeft: value,
      paddingRight: value,
    }),
    py: () => (value: any) => ({
      paddingTop: value,
      paddingBottom: value,
    }),
    m: () => (value: any) => ({
      marginTop: value,
      marginBottom: value,
      marginLeft: value,
      marginRight: value,
    }),
    mx: () => (value: any) => ({
      marginLeft: value,
      marginRight: value,
    }),
    my: () => (value: any) => ({
      marginTop: value,
      marginBottom: value,
    }),
    bc: config => (
      value: keyof typeof config['theme']['colors'] | (string & {}),
    ) => ({
      backgroundColor: value,
    }),

    br: config => (
      value: keyof typeof config['theme']['radii'] | (string & {}),
    ) => ({
      borderRadius: value,
    }),
  },
})

export const {
  styled,
  css,
  theme,
  getCssString,
  global,
  keyframes,
} = designSystem

export type CSS = StitchesCss<typeof designSystem>

export const globalStyles = global({
  '@font-face': [
    {
      fontFamily: 'Basier Circle',
      src:
        "url('/fonts/basiercircle-medium-webfont.eot'), url('/fonts/basiercircle-medium-webfont.eot?#iefix') format('embedded-opentype'), url('/fonts/basiercircle-medium-webfont.woff2') format('woff2'), url('/fonts/basiercircle-medium-webfont.woff') format('woff'), url('/fonts/basiercircle-medium-webfont.ttf') format('truetype')",
      fontWeight: '$2',
      fontStyle: 'normal',
    },
    {
      fontFamily: 'Basier Circle',
      src:
        "url('/fonts/basiercircle-bold-webfont.eot'), url('/fonts/basiercircle-bold-webfont.eot?#iefix') format('embedded-opentype'), url('/fonts/basiercircle-bold-webfont.woff2') format('woff2'), url('/fonts/basiercircle-bold-webfont.woff') format('woff'), url('/fonts/basiercircle-bold-webfont.ttf') format('truetype')",
      fontWeight: '$4',
      fontStyle: 'normal',
    },
  ],
})

const darkTheme = css({
  colors: {
    text: 'hsl(200, 12%, 5%)',
    textSecondary: 'hsl(0,0%,47%)',
    textPlaceholder: 'hsl(0,0%,73%)',
    muted: '$gray500',
    mutedHover: '$gray700',
    white: 'hsl(0,0%,100%)',
    brandPrimary: 'hsl(254,100%,50%)',
    brandPrimaryHover: darken(0.2, 'hsl(254,100%,50%)'),
    brandSecondary: 'hsl(43,100%,53%)',
    brandSecondaryHover: darken(0.2, 'hsl(43,100%,53%)'),
    brandTerciary: 'hsl(328,83%,48%)',
    brandTerciaryHover: darken(0.2, 'hsl(328,83%,48%)'),
    accentDanger: 'hsl(355,69%,51%)',
    accentDangerHover: darken(0.1, 'hsl(355,69%,51%)'),
    accentSuccess: 'hsl(96,93%,30%)',
    accentSuccessHover: darken(0.1, 'hsl(96,93%,30%)'),
    accentWarning: 'hsl(37,83%,52%)',
    accentWarningHover: darken(0.1, 'hsl(37,83%,52%)'),
    gray100: 'hsl(206,20%,98.8%)',
    gray200: 'hsl(206,14%,96.0%)',
    gray300: 'hsl(206,13%,93.7%)',
    gray400: 'hsl(206,12%,92.0%)',
    gray500: 'hsl(206,12%,89.5%)',
    gray600: 'hsl(206,11%,85.2%)',
    gray700: 'hsl(206,10%,80.0%)',
    gray800: 'hsl(206,6%,56.1%)',
    gray900: 'hsl(206,6%,43.9%)',
  },
})
