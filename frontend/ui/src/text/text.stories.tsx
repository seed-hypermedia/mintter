import type {ComponentMeta, ComponentStory} from '@storybook/react'
import React from 'react'
import {Text as TextComponent} from './text'

export default {
  title: 'Primitives/Text',
  component: TextComponent,
  argTypes: {
    color: {
      options: [
        'default',
        'alt',
        'muted',
        'opposite',
        'contrast',
        'primary',
        'secondary',
        'terciary',
        'success',
        'warning',
        'danger',
        'inherit',
      ],
      control: {type: 'select'},
      defaultValue: 'default',
      description: 'set the currentColor of the button',
    },
    size: {
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      control: {type: 'select'},
      defaultValue: '3',
      description: 'set the size of the text',
    },
    fontWeight: {
      options: ['default', 'regular', 'medium', 'bold'],
      control: {type: 'select'},
      defaultValue: 'default',
      description: 'set the fontWeight of the text',
    },
    alt: {
      control: {type: 'boolean'},
      defaultValue: false,
      description: '',
    },
  },
} as ComponentMeta<typeof TextComponent>

export const Text: ComponentStory<typeof TextComponent> = (args) => (
  <TextComponent {...args}>Almost before we knew it, we had left the ground.</TextComponent>
)
