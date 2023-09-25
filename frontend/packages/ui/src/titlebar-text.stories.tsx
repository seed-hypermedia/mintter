import React from 'react'
import {Meta} from '@storybook/react'
import {StoryObj} from '@storybook/react'
import {TitleText} from './titlebar' // Make sure to adjust the import path

const meta = {
  title: 'ui/titlebar/TitleText',
  component: TitleText,
} satisfies Meta<typeof TitleText>

type Story = StoryObj<typeof TitleText>

export const Default: Story = {
  args: {
    children: 'Hello Title Text',
  },
}

export default meta
