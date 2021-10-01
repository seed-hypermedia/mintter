import React from 'react'
import {Theme} from '../src/theme'
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
