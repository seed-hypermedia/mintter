import {Meta, StoryObj} from '@storybook/react'
import {Button} from 'tamagui'

const meta = {
  title: 'ui/Buttom',
  parameters: {layout: 'centered'},
  component: Button,
} satisfies Meta<typeof Button>

type Story = StoryObj<typeof Button>

export const Basic: Story = {
  args: {
    children: 'Button',
  },
}

export default meta
