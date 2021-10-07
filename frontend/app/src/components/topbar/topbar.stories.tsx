import type {ComponentMeta, ComponentStory} from '@storybook/react'
import {BrowserRouter as Router, Route} from 'react-router-dom'
import {Topbar} from './topbar'

export default {
  title: 'Components/Topbar',
  component: Topbar,
  decorators: [
    (Story) => (
      <Router>
        <Route>
          <Story />
        </Route>
      </Router>
    ),
  ],
} as ComponentMeta<typeof Topbar>

export const Demo: ComponentStory<typeof Topbar> = (args) => <Topbar {...args} />
