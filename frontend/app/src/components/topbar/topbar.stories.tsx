import {Theme} from '@mintter/ui/theme'
import type {ComponentMeta, ComponentStory} from '@storybook/react'
import {Topbar} from './topbar'

export default {
  title: 'Components/Topbar',
  component: Topbar,
  decorators: [
    (Story) => (
      <Theme>
        <Story />
      </Theme>
    ),
  ],
} as ComponentMeta<typeof Topbar>

export const Default: ComponentStory<typeof Topbar> = (args) => <Topbar {...args} />
