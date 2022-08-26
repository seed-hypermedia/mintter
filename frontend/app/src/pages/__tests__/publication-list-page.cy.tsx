import {createTestQueryClient} from '@app/test/utils'
import {PublicationList} from '../publication-list-page'

// TODO: FIXME
describe('Publicationlist', () => {
  // TODO: maybe there are two mainServices started here, I'm getting DraftList and PubList queryClient errors (hitting the )
  it('Should show an empty list', () => {
    cy.mount(<PublicationList />)
      .get('[data-testid="filelist-title"]')
      .contains('Publications')
      .get('[data-testid="filelist-empty-label"]')
      .contains('You have no Publications yet.')
  })

  it('should render the publication list returned', () => {
    let {client} = createTestQueryClient({
      publicationList: [
        {
          version: '1',
          document: {
            id: '1',
            title: 'document 1',
            subtitle: '',
            author: 'testauthor',
            createTime: new Date(),
            updateTime: new Date(),
            publishTime: new Date(),
            children: [],
          },
        },
        {
          version: '2',
          document: {
            id: '2',
            title: 'document 2',
            subtitle: '',
            author: 'testauthor',
            createTime: new Date(),
            updateTime: new Date(),
            publishTime: new Date(),
            children: [],
          },
        },
      ],
    })

    cy.mount(<PublicationList />, {
      client,
    })
      .get('[data-testid="filelist-list"]')
      .children()
      .should('have.length', 2)
  })
})
