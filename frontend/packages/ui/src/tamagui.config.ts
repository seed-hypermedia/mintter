import {shorthands} from '@tamagui/shorthands'
import {createTokens} from '@tamagui/web'
import {createTamagui} from 'tamagui'
import {animations} from './config/animations'
import {bodyFont, editorBody, headingFont, monoFont} from './config/fonts'
import {media, mediaQueryDefaultActive} from './config/media'
import {radius} from './themes/token-radius'
import {size} from './themes/token-size'
import {space} from './themes/token-space'
import {zIndex} from './themes/token-z-index'

import * as themes from './themes-generated'
import {color} from './themes/token-colors'

const conf = {
  themes,
  defaultFont: 'body',
  animations,
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
    mono: monoFont,
    editorBody: editorBody,
  },
  tokens: createTokens({
    color,
    radius,
    zIndex,
    space,
    size,
  }),
  media,
  settings: {
    webContainerType: 'inherit',
  },
} satisfies Parameters<typeof createTamagui>['0']

// @ts-ignore - passing this directly breaks TS types
conf.mediaQueryDefaultActive = mediaQueryDefaultActive

export const config = createTamagui(conf)
