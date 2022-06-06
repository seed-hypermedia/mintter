import {AppProviders} from '@app/app-providers'
import {mount} from '@cypress/react'
import {Avatar} from '../avatar'

describe('<Avatar />', () => {
  it('default', () => {
    mount(
      <AppProviders>
        <Avatar size="3" />
      </AppProviders>,
    )
  })
})
