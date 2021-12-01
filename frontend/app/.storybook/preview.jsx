import {Theme} from '@mintter/ui/theme'
import * as React from 'react'
export const parameters = {
  actions: {argTypesRegex: '^on[A-Z].*'},
  controls: {
    matchers: {
      date: /Date$/,
    },
  },
  themes: {
    default: 'dark',
    list: [
      {name: 'light', class: 'light-theme', color: '#F2F2F2'},
      {name: 'dark', class: 'dark-theme', color: '#1A1A1A'},
    ],
  },
}

export const decorators = [
  (Story) => (
    <Theme>
      <Story />
    </Theme>
  ),
]
