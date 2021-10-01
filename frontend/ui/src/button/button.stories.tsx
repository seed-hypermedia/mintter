import type {ComponentMeta, ComponentStory} from '@storybook/react'
import React from 'react'
import {Button} from './button'

export default {
  title: 'Button',
  component: Button,
  argTypes: {
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
} as ComponentMeta<typeof Button>

const Template: ComponentStory<typeof Button> = (args) => <Button {...args}>Button</Button>

export const Demo = Template.bind({})
