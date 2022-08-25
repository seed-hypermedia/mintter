import {createTestQueryClient} from '@app/../cypress/support/test-provider'
import {DraftList} from '@app/pages/draft-list-page'

// TODO: FIXME
describe('DraftList', () => {
  // TODO: maybe there are two mainServices started here, I'm getting DraftList and PubList queryClient errors (hitting the )
  it('Should show an empty list', () => {
    let {client} = createTestQueryClient({
      draftList: [],
    })

    let createNewDraft = cy.stub()

    cy.mount(
      <DraftList
        createNewDraft={createNewDraft}
        createDraftInNewWindow={createNewDraft}
      />,
      {
        client,
      },
    )
      .get('[data-testid="draft-list-page-title"]')
      .contains('Drafts')
      .get('[data-testid="empty-list-box"]')
      .contains('No Publications yet.')
      .get('[data-testid="create-draft-button"]')
      .click()
      .get('[data-testid="create-draft-button-in-window"]')
      .click()
      .then(() => {
        expect(createNewDraft).callCount(2)
      })
  })

  it.only('should render the draft list returned', () => {
    let {client} = createTestQueryClient({
      draftList: [
        {
          id: '1',
          title: 'document 1',
          subtitle: '',
          author: 'testauthor',
          createTime: new Date(),
          updateTime: new Date(),
          publishTime: new Date(),
          children: [],
        },
        {
          id: '2',
          title: 'document 2',
          subtitle: '',
          author: 'testauthor',
          createTime: new Date(),
          updateTime: new Date(),
          publishTime: new Date(),
          children: [],
        },
      ],
    })

    console.log('client', client)

    cy.mount(<DraftList />, {
      client,
    })
  })
})
