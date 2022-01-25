import {AppProviders} from '@app/app-providers'
import {mount} from '@cypress/react'
import {LibraryItem} from '../library-item'

describe('<LibraryItem />', () => {
  it('default', () => {
    mount(
      <AppProviders>
        <LibraryItem href="/test" title="default" />
      </AppProviders>,
    )
      .get('li')
      .contains('default')
      .should('be.visible')
  })

  it('ellipsis text', () => {
    mount(
      <AppProviders>
        <LibraryItem
          href="/test"
          title="Some text that is very long to see the ellipsis Some text that is very long to see the ellipsis Some text that is very long to see the ellipsis Some text that is very long to see the ellipsis"
        />
      </AppProviders>,
    )
  })
})
