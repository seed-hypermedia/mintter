import {Meta, StoryObj} from '@storybook/react'
import {UIAvatar} from './avatar'

const meta = {
  title: 'ui/Avatar',
  parameters: {layout: 'centered'},
  component: UIAvatar,
} satisfies Meta<typeof UIAvatar>

type Story = StoryObj<typeof UIAvatar>

export const Basic: Story = {
  args: {
    url: 'https://i.pravatar.cc/300',
    color: 'mint',
    label: 'Demo Avatar',
  },
}

export default meta
