import {Box} from '@mintter/ui/box'
import type {ComponentMeta, ComponentStory} from '@storybook/react'
import React from 'react'
import {Icon as Component, icons} from './icon'

export default {
  title: 'Primitives/Icon',
  component: Component,
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
  decorators: [
    (Story) => (
      <Box
        css={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
          gap: '$6',
          alignItems: 'center',
        }}
      >
        <Story />
      </Box>
    ),
  ],
} as ComponentMeta<typeof Component>

export const Playground: ComponentStory<typeof Component> = (args) => <Component {...args} />

export const Names: ComponentStory<typeof Component> = (args) => (
  <>
    {Object.keys(icons).map((name) => (
      <Component {...args} key={name} name={name as keyof typeof icons} />
    ))}
  </>
)
