import {ListCitationsResponse, Publication} from '@mintter/shared'
import {queryKeys} from '@app/hooks'
import {createTestQueryClient} from '@app/test/utils'
import PublicationList, {PublicationListItem} from '../publication-list-page'

// TODO: FIXME
describe('Publications List', () => {
  // TODO: maybe there are two mainServices started here, I'm getting DraftList and PubList queryClient errors (hitting the )
  it('Should show an empty list', () => {
    cy.mount(<PublicationList />)
      .get('[data-testid="empty-list-description"]')
      .contains('You have no Publications yet.')
  })

  it('should render the publication list returned', () => {
    let {client} = createTestQueryClient({
      publicationList: [
        {
          version: 'v1',
          document: {
            id: 'd1',
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
          version: 'v1',
          document: {
            id: 'd2',
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
      authors: [{id: 'testauthor'}],
    })

    client.setQueryData<ListCitationsResponse>(
      [queryKeys.GET_PUBLICATION_DISCUSSION, 'd1', 'v1'],
      {
        links: [],
      },
    )

    client.setQueryData<ListCitationsResponse>(
      [queryKeys.GET_PUBLICATION_DISCUSSION, 'd2', 'v1'],
      {
        links: [],
      },
    )

    cy.mount(<PublicationList />, {
      client,
    })
      .get('[data-testid="files-list"]')
      .children()
      .should('have.length', 2)
  })

  describe('Publication list item', () => {
    let publication: Publication = {
      version: 'v1',
      document: {
        id: 'd1',
        title: 'document 1',
        subtitle: '',
        author: 'testauthor',
        createTime: new Date(),
        updateTime: new Date(),
        publishTime: new Date(),
        children: [],
      },
    }

    it('should render all the content', () => {
      let {authors, client} = createTestQueryClient({
        publication,
        authors: [{id: 'testauthor'}],
      })
      let setLocation = cy.stub()

      cy.mount(<PublicationListItem publication={publication} />, {
        client,
        setLocation,
      })
        .get('[data-testid="list-item-title"]')
        .contains(publication.document.title)
        .get('[data-testid="list-item-author"]')
        .contains(authors[0].profile?.alias)
        .get('[data-testid="list-item-date"]')
        .contains('just now')
    })

    it('should navigate to the publication', () => {
      let {client} = createTestQueryClient({
        publication,
        authors: [{id: 'testauthor'}],
      })
      let setLocation = cy.spy()

      cy.mount(<PublicationListItem publication={publication} />, {
        setLocation,
        client,
      })
        .get('[data-testid="list-item-title"]')
        .click()
        .get('[data-testid="list-item-author"]')
        .click()
        .get('[data-testid="list-item-date"]')
        .click()
        .then(() => {
          expect(setLocation).to.be.calledThrice
          expect(setLocation.args).to.deep.equal([
            ['/p/d1/v1'],
            ['/p/d1/v1'],
            ['/p/d1/v1'],
          ])
        })
    })

    it.skip('should copy publication to clipboard', () => {
      let {client} = createTestQueryClient({
        publication,
        authors: [{id: 'testauthor'}],
      })
      cy.mount(<PublicationListItem publication={publication} />, {
        client,
      })
        .get('[data-trigger]')
        .click({force: true})

        .get('[data-testid="library-item-dropdown-root"]')
        .should('be.visible')
        .get('[data-testid="copy-item"]')
        .click()
        .then(() => {
          // TODO: get the clipboard value from the system
        })
    })

    it('should open in the same window', () => {
      let setLocation = cy.spy()
      let {client} = createTestQueryClient({
        publication,
        authors: [{id: 'testauthor'}],
      })
      cy.mount(<PublicationListItem publication={publication} />, {
        client,
        setLocation,
      })
        .get('[data-trigger]')
        .click({force: true})
        .get('[data-testid="open-item"]')
        .click()
        .then(() => {
          // TODO: get the clipboard value from the system
          expect(setLocation).to.have.been.calledOnceWith('/p/d1/v1')
        })
    })

    it('should open in a new window', () => {
      let {client} = createTestQueryClient({
        publication,
        authors: [{id: 'testauthor'}],
      })
      cy.mount(<PublicationListItem publication={publication} />, {
        client,
      })
        .get('[data-trigger]')
        .click({force: true})
        .get('[data-testid="open-item"]')
        .click()
        .then(() => {
          // TODO: mock the window function (maybe mock the mainService event)
        })
    })

    it('should delete', () => {
      let {client} = createTestQueryClient({
        publication,
        authors: [{id: 'testauthor'}],
      })
      cy.mount(<PublicationListItem publication={publication} />, {
        client,
      })
        .get('[data-trigger]')
        .click({force: true})
        .get('[data-testid="delete-item"]')
        .click()
        .then(() => {
          // TODO: mock the window function (maybe mock the mainService event)
        })
    })
  })
})
