import { createInterFont } from '@tamagui/font-inter'
import { shorthands } from '@tamagui/shorthands'
import * as tamaguiDefaults from '@tamagui/themes'
import { createFont, GenericFont, Variable } from '@tamagui/web'
import { createTamagui, createTokens } from 'tamagui'

import * as colors from '@tamagui/colors'
import { createMedia } from '@tamagui/react-native-media-driver'


var headingFont = createInterFont({
  size: {
    6: 15,
  },
  transform: {
    6: 'uppercase',
    7: 'none',
  },
  weight: {
    6: '400',
    7: '700',
  },
  color: {
    6: '$colorFocus',
    7: '$color',
  },
  letterSpacing: {
    5: 2,
    6: 1,
    7: 0,
    8: -1,
    9: -2,
    10: -3,
    12: -4,
    14: -5,
    15: -6,
  },
  face: {
    700: {normal: 'InterBold'},
  },
})

var bodyFont = createInterFont(
  {
    face: {
      700: {normal: 'InterBold'},
    },
  },
  {
    sizeSize: (size) => Math.round(size * 1.1),
    sizeLineHeight: (size) => Math.round(size * 1.1 + (size > 20 ? 10 : 10)),
  },
)

const monoFont = createGenericFont(
  `"ui-monospace", "SFMono-Regular", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`,
  {
    weight: {
      1: '500',
    },
    size: {
      1: 11,
      2: 12,
      3: 13,
      4: 13,
      5: 14,
      6: 16,
      7: 18,
      8: 20,
      9: 24,
      10: 32,
      11: 46,
      12: 62,
      13: 72,
      14: 92,
      15: 114,
      16: 124,
    },
  },
  {
    sizeLineHeight: (x) => x * 1.5,
  },
)

export const colorTokens = {
  light: {
    mint: colors.mint,
    blue: colors.blue,
    gray: colors.gray,
    green: colors.green,
    red: colors.red,
    yellow: colors.yellow,
  },
  dark: {
    mint: colors.mintDark,
    blue: colors.blueDark,
    gray: colors.grayDark,
    green: colors.greenDark,
    red: colors.redDark,
    yellow: colors.yellowDark,
  },
}

export const darkColors = {
  ...colorTokens.dark.mint,
  ...colorTokens.dark.blue,
  ...colorTokens.dark.gray,
  ...colorTokens.dark.green,
  ...colorTokens.dark.red,
  ...colorTokens.dark.yellow,
}

export const lightColors = {
  ...colorTokens.light.mint,
  ...colorTokens.light.blue,
  ...colorTokens.light.gray,
  ...colorTokens.light.green,
  ...colorTokens.light.red,
  ...colorTokens.light.yellow,
}

export const color = {
  ...postfixObjKeys(lightColors, 'Light'),
  ...postfixObjKeys(darkColors, 'Dark'),
}

function postfixObjKeys<
  A extends {[key: string]: Variable<string> | string},
  B extends string,
>(
  obj: A,
  postfix: B,
): {
  [Key in `${keyof A extends string ? keyof A : never}${B}`]:
    | Variable<string>
    | string
} {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [`${k}${postfix}`, v]),
  ) as any
}

// this values will generate all the theme tokes we need in the app
export var tokens = createTokens({
  color,
  radius: {
    ...tamaguiDefaults.radius,
  },
  zIndex: {
    ...tamaguiDefaults.zIndex,
    max: 99999,
  },
  size: {
    ...tamaguiDefaults.size,
  },
  space: {
    ...tamaguiDefaults.space,
  },
})

export var config = createTamagui({
  // animations,
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
    mono: monoFont,
  },
  themes: {
    ...tamaguiDefaults.themes,
    dark: {
      ...tamaguiDefaults.themes.dark,
      link: '#6ebcf5',
      webLink: '#678af5',
      mint: '#6ebcf5',
    },
    light: {
      ...tamaguiDefaults.themes.light,
      mint: '#0d70b8',
      link: '#0d70b8',
      webLink: '#0d38b8',
    },
  },
  tokens,
  media: createMedia({
    xs: {maxWidth: 660},
    sm: {maxWidth: 800},
    md: {maxWidth: 1020},
    lg: {maxWidth: 1280},
    xl: {maxWidth: 1420},
    xxl: {maxWidth: 1600},
    gtXs: {minWidth: 660 + 1},
    gtSm: {minWidth: 800 + 1},
    gtMd: {minWidth: 1020 + 1},
    gtLg: {minWidth: 1280 + 1},
    gtXl: {minWidth: 1420 + 1},
    gtXxl: {minWidth: 1600 + 1},
    short: {maxHeight: 820},
    tall: {minHeight: 820},
    hoverNone: {hover: 'none'},
    pointerCoarse: {pointer: 'coarse'},
  }),
})

const genericFontSizes = {
  1: 10,
  2: 11,
  3: 12,
  4: 14,
  5: 15,
  6: 16,
  7: 20,
  8: 22,
  9: 30,
  10: 42,
  11: 52,
  12: 62,
  13: 72,
  14: 92,
  15: 114,
  16: 124,
} as const

export function createGenericFont<
  A extends GenericFont<keyof typeof genericFontSizes>,
>(
  family: string,
  font: Partial<A> = {},
  {
    sizeLineHeight = (val) => val * 1.35,
  }: {
    sizeLineHeight?: (val: number) => number
  } = {},
): A {
  const size = font.size || genericFontSizes
  return createFont({
    family,
    size,
    lineHeight: Object.fromEntries(
      Object.entries(size).map(([k, v]) => [k, sizeLineHeight(+v)]),
    ) as typeof size,
    weight: {0: '300'},
    letterSpacing: {4: 0},
    ...(font as any),
  })
}
