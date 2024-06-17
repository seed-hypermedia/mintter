export {
  blue,
  blueDark,
  gray,
  grayDark,
  green,
  greenDark,
  orange,
  orangeDark,
  pink,
  pinkDark,
  purple,
  purpleDark,
  red,
  redDark,
  yellow,
  yellowDark
} from '@tamagui/themes'

export const lightTransparent = 'rgba(255,255,255,0)'
export const darkTransparent = 'rgba(10,10,10,0)'

// extra mintty colors
export const mint = {
  mint1: 'hsl(189, 65.0%, 99.4%)',
  mint2: 'hsl(185, 100%, 99.0%)',
  mint3: 'hsl(185, 83.1%, 97.0%)',
  mint4: 'hsl(184, 76.4%, 94.7%)',
  mint5: 'hsl(184, 70.8%, 91.8%)',
  mint6: 'hsl(183, 65.4%, 87.8%)',
  mint7: 'hsl(182, 61.0%, 81.7%)',
  mint8: 'hsl(181, 60.0%, 73.5%)',
  mint9: 'hsl(181, 51.0%, 54.0%)',
  mint10: 'hsl(181, 46.8%, 50.3%)',
  mint11: 'hsl(181, 50.0%, 45.8%)', // PLEASE manually sync with editor.css .ProseMirror .hm-link
  mint12: 'hsl(181, 66.0%, 16.0%)',
}
export const mintDark = {
  mint1: 'hsl(193, 20.0%, 9.6%)',
  mint2: 'hsl(192, 30.0%, 11.8%)',
  mint3: 'hsl(190, 37.5%, 16.5%)',
  mint4: 'hsl(189, 41.2%, 20.0%)',
  mint5: 'hsl(188, 43.8%, 23.3%)',
  mint6: 'hsl(186, 46.4%, 27.5%)',
  mint7: 'hsl(184, 49.3%, 34.6%)',
  mint8: 'hsl(181, 52.1%, 45.9%)',
  mint9: 'hsl(181, 51.0%, 54.0%)',
  mint10: 'hsl(182, 57.3%, 59.1%)',
  mint11: 'hsl(184, 80.0%, 71.0%)', // PLEASE manually sync with editor.css .seed-app-dark .ProseMirror .hm-link
  mint12: 'hsl(188, 75.0%, 95.7%)',
}

export const lightColor = 'hsl(0, 0%, 9.0%)'
export const lightPalette = [
  lightTransparent,
  '#fff',
  '#f9f9f9',
  'hsl(0, 0%, 97.3%)',
  'hsl(0, 0%, 95.1%)',
  'hsl(0, 0%, 94.0%)',
  'hsl(0, 0%, 92.0%)',
  'hsl(0, 0%, 89.5%)',
  'hsl(0, 0%, 81.0%)',
  'hsl(0, 0%, 56.1%)',
  'hsl(0, 0%, 50.3%)',
  'hsl(0, 0%, 42.5%)',
  lightColor,
  darkTransparent,
]

export const darkColor = '#fff'
export const darkPalette = [
  darkTransparent,
  '#050505',
  '#151515',
  '#191919',
  '#232323',
  '#282828',
  '#323232',
  '#424242',
  '#494949',
  '#545454',
  '#626262',
  '#a5a5a5',
  darkColor,
  lightTransparent,
]
