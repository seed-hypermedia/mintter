import {Box} from '@mintter/ui/box'
import type {ComponentMeta, ComponentStory} from '@storybook/react'
import React from 'react'
import {Button as Component} from './button'

export default {
  title: 'Primitives/Button',
  component: Component,
  argTypes: {
    onClick: {action: 'clicked'},
    color: {
      options: ['primary', 'secondary', 'terciary', 'success', 'warning', 'danger', 'muted'],
      control: {type: 'select'},
      defaultValue: 'primary',
      description: 'set the currentColor of the button',
    },
    size: {
      options: ['1', '2', '3'],
      control: {type: 'select'},
      defaultValue: '2',
      description: 'set the size of the button',
    },
    variant: {
      options: ['solid', 'outlined', 'ghost'],
      control: {type: 'select'},
      defaultValue: 'solid',
      description: 'set the type of the button',
    },
    shape: {
      options: ['rounded', 'pill'],
      control: {type: 'inline-radio'},
      defaultValue: 'rounded',
      description: 'Defines the shape of the outside of the button',
    },
  },
  decorators: [
    (Story) => (
      <Box css={{display: 'flex', gap: '$4', alignItems: 'center'}}>
        <Story />
      </Box>
    ),
  ],
} as ComponentMeta<typeof Component>

export const Playground: ComponentStory<typeof Component> = (args) => <Component {...args}>Button</Component>

export const Colors: ComponentStory<typeof Component> = (args) => (
  <>
    <Component {...args} color="primary">
      Primary
    </Component>
    <Component {...args} color="secondary">
      Secondary
    </Component>
    <Component {...args} color="terciary">
      Terciary
    </Component>
    <Component {...args} color="success">
      Success
    </Component>
    <Component {...args} color="warning">
      Warning
    </Component>
    <Component {...args} color="danger">
      Danger
    </Component>
    <Component {...args} color="muted">
      Muted
    </Component>
  </>
)

export const Sizes: ComponentStory<typeof Component> = (args) => (
  <>
    <Component {...args} size="1">
      Small Button
    </Component>
    <Component {...args} size="2">
      Medium Button
    </Component>
    <Component {...args} size="3">
      Large Button
    </Component>
  </>
)

export const Variants: ComponentStory<typeof Component> = (args) => (
  <>
    <Component {...args} variant="solid">
      Solid Button
    </Component>
    <Component {...args} variant="outlined">
      Outlined Button
    </Component>
    <Component {...args} variant="ghost">
      Ghost Button
    </Component>
  </>
)

export const Shapes: ComponentStory<typeof Component> = (args) => (
  <>
    <Component {...args} shape="rounded">
      Outlined Button
    </Component>
    <Component {...args} shape="pill">
      Solid Button
    </Component>
  </>
)
