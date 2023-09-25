import React from 'react'
import {Meta} from '@storybook/react'
import {StoryObj} from '@storybook/react'
import {TitlebarWrapper} from './titlebar' // Make sure to adjust the import path

const meta = {
  title: 'ui/titlebar/TitlebarWrapper',
  component: TitlebarWrapper,
} satisfies Meta<typeof TitlebarWrapper>

type Story = StoryObj<typeof TitlebarWrapper>

export const Default: Story = {}

export default meta
