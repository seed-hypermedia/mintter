import {DraftList} from '@app/pages/draft-list-page'
import {createTestQueryClient} from '@app/test/utils'

// TODO: FIXME
describe('DraftList', () => {
  // TODO: maybe there are two mainServices started here, I'm getting DraftList and PubList queryClient errors (hitting the )
  it('Should show an empty list', () => {
    cy.mount(<DraftList />)
      .get('[data-testid="filelist-title"]')
      .contains('Drafts')
      .get('[data-testid="filelist-empty-label"]')
      .contains('You have no Drafts yet.')
  })

  it('should render the draft list returned', () => {
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

      authors: [{id: 'testauthor'}],
    })

    cy.mount(<DraftList />, {
      client,
    })
      .get('[data-testid="filelist-list"]')
      .children()
      .should('have.length', 2)
  })
})
