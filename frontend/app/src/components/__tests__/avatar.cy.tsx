import { AppProviders } from '@app/app-providers'
import { Avatar } from '@components/avatar'
import { mount } from '@cypress/react'

describe('<Avatar />', () => {
  it('default', () => {
    mount(
      <AppProviders>
        <Avatar size="3" />
      </AppProviders>,
    ).
  })
})
