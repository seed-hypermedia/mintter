import React, {Fragment} from 'react'

import {Theme} from '../src/theme'
import {Code} from './components/code'

export const parameters = {
  actions: {argTypesRegex: '^on[A-Z].*'},
  options: {
    storySort: {
      order: [
        'Overview',
        ['Getting Started', 'Theme'],
        'Layout',
        ['Box'],
        'Data Display',
        ['Text'],
        'Forms',
        ['Text Field', 'Button'],
        'Feedback',
        ['Alert'],
        'Other',
        ['Theme'],
      ],
    },
  },
  docs: {
    components: {
      pre: ({children}: {children: React.ReactNode}) => {
        return <Fragment>{children}</Fragment>
      },
      code: Code,
    },
  },
}

export const decorators = [
  (Story: React.ComponentType) => {
    return (
      <Theme>
        <Story />
      </Theme>
    )
  },
]
