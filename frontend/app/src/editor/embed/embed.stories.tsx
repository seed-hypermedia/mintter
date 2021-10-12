import {ComponentMeta, ComponentStory} from '@storybook/react'
import {EmbedUI} from 'frontend/app/src/editor/embed'

export default {
  title: 'Editor Elements/Embed',
  component: EmbedUI,
} as ComponentMeta<typeof EmbedUI>

export const Default: ComponentStory<typeof EmbedUI> = (args) => <EmbedUI>hello Embed</EmbedUI>
