import React from 'react'
import {Meta} from '@storybook/react'
import {StoryObj} from '@storybook/react'
import {Tooltip} from './tooltip'
import {Button, XStack} from 'tamagui'

const meta = {
  title: 'ui/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Tooltip>

type Story = StoryObj<typeof Tooltip>

const Template: Story = {
  render: ({content, placement}) => {
    return (
      <XStack ai="center">
        <Tooltip content={content} placement={placement}>
          <Button>Hover me</Button>
        </Tooltip>
      </XStack>
    )
  },
}

export const Default: Story = {
  ...Template,
  args: {
    content: 'Tooltip content',
  },
}

export const Bottom: Story = {
  ...Template,
  args: {
    content: 'Tooltip at the bottom',
    placement: 'bottom',
  },
}

export const Top: Story = {
  ...Template,
  args: {
    content: 'Tooltip at the top',
    placement: 'top',
  },
}

export const Left: Story = {
  ...Template,
  args: {
    content: 'Tooltip at the left',
    placement: 'left',
  },
}

export const Right: Story = {
  ...Template,
  args: {
    content: 'Tooltip at the right',
    placement: 'right',
  },
}

export default meta
