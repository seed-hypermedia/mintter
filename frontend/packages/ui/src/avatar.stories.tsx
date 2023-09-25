import {Meta, StoryObj} from '@storybook/react'
import {FontSizeTokens, H4, Paragraph} from 'tamagui'
import {UIAvatar} from './avatar'

const meta: Meta<typeof UIAvatar> = {
  title: 'ui/Avatar',
  parameters: {layout: 'centered'},
  component: UIAvatar,
}

type Story = StoryObj<typeof UIAvatar>

export const Basic: Story = {
  args: {
    url: 'https://i.pravatar.cc/300',
    color: 'mint',
    label: 'Demo Avatar',
  },
  argTypes: {
    size: {
      options: ['$2', '$3', '$5', '$10'] as Array<FontSizeTokens>,
      control: {type: 'radio'},
    },
  },
}

export default meta
