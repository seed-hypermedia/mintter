import {Account, Publication} from '@app/client'
import {ListCitationsResponse} from '@app/client/.generated/documents/v1alpha/documents'
import {queryKeys} from '@app/hooks'
import {createTestQueryClient} from '@app/test/utils'
import {Topbar, TopbarLibrarySection} from './topbar'

/**
 *
 */
describe('Topbar', () => {
  it('default', () => {
    cy.mount(<Topbar />)
      .get('[data-testid="topbar-title"]')
      .contains('Publications')
      .get('[data-testid="topbar-publication-actions"]')
      .should('not.exist')
      .get('[data-testid="topbar-draft-actions"]')
      .should('not.exist')
  })

  it('should navigation buttons work + library toggle', () => {
    var props = {
      handleBack: cy.stub(),
      handleForward: cy.stub(),
      handleLibraryToggle: cy.stub(),
      libraryLabel: 'demo',
    }

    cy.mount(<TopbarLibrarySection {...props} />)
      .get('[data-testid="history-back"]')
      .click()
      .then(() => {
        expect(props.handleBack).to.be.calledOnce
      })
      .get('[data-testid="history-forward"]')
      .click()
      .then(() => {
        expect(props.handleBack).to.be.calledOnce
      })
      .get('[data-testid="library-toggle-button"]')
      .click()
      .then(() => {
        expect(props.handleBack).to.be.calledOnce
      })
  })

  describe('Topbar with Draft', () => {
    it('should render draft title', () => {
      // noop
    })
  })

  describe('Topbar with publication', () => {
    let publication: Publication = {
      version: 'v1',
      document: {
        id: 'd1',
        title: 'Document title test',
        author: 'authorid',
        subtitle: '',
        children: [],
        createTime: new Date(),
        updateTime: new Date(),
        publishTime: new Date(),
      },
    }

    var theAuthors: Array<Account> = []

    beforeEach(() => {
      let {client, authors} = createTestQueryClient({
        authors: [
          {
            id: 'authorid',
          },
        ],
        publication,
        publicationList: [publication],
      })

      client.setQueryData<ListCitationsResponse>(
        [
          queryKeys.GET_PUBLICATION_DISCUSSION,
          publication.document?.id,
          publication.version,
        ],
        {
          links: [],
        },
      )

      theAuthors = authors as Array<Account>

      cy.mount(<Topbar />, {
        client,
        path: '/p/d1/v1',
      })
    })

    it('should render publication title and author', () => {
      cy.get('[data-testid="topbar-title"]')
        .contains(publication.document?.title ?? '')
        .get('[data-testid="topbar-author"]')
        .contains(theAuthors?.[0].profile?.alias ?? '')
    })

    it('should copy publication link to clipboard', () => {
      // noop
    })

    it('should add to bookmarks', () => {
      // noop
    })
    it('should call edit', () => {
      // noop
    })

    it('should call reply', () => {
      // noop
    })
    it('should call review', () => {
      // noop
    })
    it('should show date metadata', () => {
      // noop
    })
    it('should call new document', () => {
      // noop
    })
  })
})
