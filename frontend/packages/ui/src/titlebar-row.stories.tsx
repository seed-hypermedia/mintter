import {Meta} from '@storybook/react'
import {StoryObj} from '@storybook/react'
import {TitlebarRow} from './titlebar' // Make sure to adjust the import path

const meta = {
  title: 'ui/titlebar/TitlebarRow',
  component: TitlebarRow,
} satisfies Meta<typeof TitlebarRow>

type Story = StoryObj<typeof TitlebarRow>

export const Default: Story = {}

export default meta
