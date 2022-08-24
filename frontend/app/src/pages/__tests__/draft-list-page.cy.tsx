import {createTestQueryClient} from '@app/../cypress/support/test-provider'
import {DraftList} from '@app/pages/draft-list-page'

// TODO: FIXME
describe('DraftList', () => {
  // TODO: maybe there are two mainServices started here, I'm getting DraftList and PubList queryClient errors (hitting the )
  it('Should show an empty list', () => {
    let {client} = createTestQueryClient({
      draftList: [],
    })

    cy.mount(<DraftList />, {
      client,
    }).get('[data-testid="draft-list-page-title"]')
  })
})
