import {Meta} from '@storybook/react'
import {StoryObj} from '@storybook/react'
import {TitlebarSection} from './titlebar' // Make sure to adjust the import path

const meta = {
  title: 'ui/titlebar/TitlebarSection',
  component: TitlebarSection,
} satisfies Meta<typeof TitlebarSection>

type Story = StoryObj<typeof TitlebarSection>

export const Default: Story = {}

export default meta
