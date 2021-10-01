import {Box} from '@mintter/ui/box'
import type {ComponentMeta, ComponentStory} from '@storybook/react'
import React from 'react'
import {Text as Component} from './text'

export default {
  title: 'Primitives/Text',
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
  decorators: [
    (Story) => (
      <Box css={{display: 'flex', flexDirection: 'column', gap: '$4'}}>
        <Story />
      </Box>
    ),
  ],
} as ComponentMeta<typeof Component>

export const Playground: ComponentStory<typeof Component> = (args) => (
  <>
    <Component {...args}>Almost before we knew it, we had left the ground.</Component>
    <Component {...args} alt>
      Almost before we knew it, we had left the ground.
    </Component>
  </>
)

export const Colors: ComponentStory<typeof Component> = (args) => (
  <>
    <Component {...args} color="default">
      Default Color
    </Component>
    <Component {...args} color="alt">
      Alternative Color
    </Component>
    <Component {...args} color="muted">
      Muted Color
    </Component>
    <Component {...args} color="opposite">
      Opposite Color
    </Component>
    <Component {...args} color="contrast">
      Contrast Color
    </Component>
    <Component {...args} color="primary">
      Primary Color
    </Component>
    <Component {...args} color="secondary">
      Secondary Color
    </Component>
    <Component {...args} color="terciary">
      Terciary Color
    </Component>
    <Component {...args} color="success">
      Success Color
    </Component>
    <Component {...args} color="warning">
      Warning Color
    </Component>
    <Component {...args} color="danger">
      Danger Color
    </Component>
    <Component {...args} color="inherit">
      Inherit Color
    </Component>
  </>
)

export const Sizes: ComponentStory<typeof Component> = (args) => (
  <>
    <Component {...args} size="1">
      Almost before we knew it, we had left the ground.
    </Component>
    <Component {...args} size="2">
      Almost before we knew it, we had left the ground.
    </Component>
    <Component {...args} size="3">
      Almost before we knew it, we had left the ground.
    </Component>
    <Component {...args} size="4">
      Almost before we knew it, we had left the ground.
    </Component>
    <Component {...args} size="5">
      Almost before we knew it, we had left the ground.
    </Component>
    <Component {...args} size="6">
      Almost before we knew it, we had left the ground.
    </Component>
    <Component {...args} size="7">
      Almost before we knew it, we had left the ground.
    </Component>
    <Component {...args} size="8">
      Almost before we knew it, we had left the ground.
    </Component>
    <Component {...args} size="9">
      Almost before we knew it, we had left the ground.
    </Component>
  </>
)

Colors.args = {
  size: '6',
}

export const FontWeights: ComponentStory<typeof Component> = (args) => (
  <>
    <Component {...args} fontWeight="default">
      Almost before we knew it, we had left the ground.
    </Component>
    <Component {...args} fontWeight="regular">
      Almost before we knew it, we had left the ground.
    </Component>
    <Component {...args} fontWeight="medium">
      Almost before we knew it, we had left the ground.
    </Component>
    <Component {...args} fontWeight="bold">
      Almost before we knew it, we had left the ground.
    </Component>
  </>
)
