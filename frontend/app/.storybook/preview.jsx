import {Theme} from '@mintter/ui/theme'
import React from 'react'
export const parameters = {
  actions: {argTypesRegex: '^on[A-Z].*'},
  controls: {
    matchers: {
      date: /Date$/,
    },
  },
}

export const decorators = [
  (Story) => (
    <Theme>
      <Story />
    </Theme>
  ),
]
