import type {ComponentMeta, ComponentStory} from '@storybook/react'
import {StaticParagraphUI} from './static-paragraph-ui'

export default {
  title: 'Editor Elements/Static Paragraph',
  component: StaticParagraphUI,
  args: {
    label: 'Static Paragraph Element',
  },
  argTypes: {
    size: {
      options: [5, 6, 7, 8, 9],
      control: {type: 'inline-radio'},
      defaultValue: 9,
    },
  },
} as ComponentMeta<typeof StaticParagraphUI>

const Template: ComponentStory<typeof StaticParagraphUI> = (args) => (
  <StaticParagraphUI {...args}>{args.label}</StaticParagraphUI>
)

export const Default = Template.bind({})

Default.args = {
  as: 'p',
  size: 4,
}
