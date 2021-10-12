import {Theme} from '@mintter/ui/theme'
import type {ComponentMeta, ComponentStory} from '@storybook/react'
import {ParagraphUI} from './paragraph-ui'
export default {
  title: 'Editor Elements/Paragraph',
  component: ParagraphUI,
  args: {
    alt: true,
  },
  argTypes: {
    size: {
      options: [1, 2, 3, 4],
      control: {type: 'inline-radio'},
      defaultValue: 4,
    },
  },
  decorators: [
    (Story) => (
      <Theme>
        <div style={{padding: 20}}>
          <Story />
        </div>
      </Theme>
    ),
  ],
} as ComponentMeta<typeof ParagraphUI>

const Template: ComponentStory<typeof ParagraphUI> = (args) => (
  <ParagraphUI {...args}>
    Lorem ipsum dolor sit amet, consectetur adipisicing elit. Repudiandae consequuntur vitae perspiciatis, illum natus
    veritatis beatae ratione cum sapiente fuga alias explicabo dolorum quod soluta placeat maxime, nam autem rem.
  </ParagraphUI>
)

export const Default = Template.bind({})

Default.args = {
  alt: true,
}
