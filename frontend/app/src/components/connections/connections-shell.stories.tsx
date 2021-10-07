import type {ComponentMeta, ComponentStory} from '@storybook/react'
import {ConnectionsShell} from './connections-shell'

export default {
  title: 'Components/Connections Shell',
  component: ConnectionsShell,
} as ComponentMeta<typeof ConnectionsShell>

export const Demo: ComponentStory<typeof ConnectionsShell> = (args) => <ConnectionsShell {...args} />
