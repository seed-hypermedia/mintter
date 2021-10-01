import type {ComponentMeta, ComponentStory} from '@storybook/react'
import React from 'react'
import {Icon as IconComponent, icons} from './icon'

export default {
  title: 'Primitives/Icon',
  component: IconComponent,
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
      description: 'set the currentColor of the icon',
    },
    size: {
      options: ['1', '2', '3'],
      control: {type: 'select'},
      defaultValue: '2',
      description: 'set the size of the button',
    },
    name: {
      options: Object.keys(icons),
      control: {type: 'select'},
      defaultValue: 'Mintter',
      description: 'Icon name',
    },
  },
} as ComponentMeta<typeof IconComponent>

export const Icon: ComponentStory<typeof IconComponent> = (args) => <IconComponent {...args}>Button</IconComponent>
