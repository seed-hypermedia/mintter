import {Account, Document, Publication} from '@app/client'
import {ListCitationsResponse} from '@app/client/.generated/documents/v1alpha/documents'
import {queryKeys} from '@app/hooks'
import {createTestQueryClient} from '@app/test/utils'
import Topbar, {HistoryButtons, Menu} from '../topbar'

/**
 *
 */

describe('Topbar', () => {
  it('should render the default topbar', () => {
    cy.mount(<Topbar />)
      .get('[data-testid="topbar-title"]')
      .contains('Inbox')
  })

  it('should render the Inbox topbar', () => {
    cy.mount(<Topbar />, {
      path: '/inbox',
    })
      .get('[data-testid="topbar-title"]')
      .contains('Inbox')
  })

  it('should render the Drafts topbar', () => {
    cy.mount(<Topbar />, {
      path: '/drafts',
    })
      .get('[data-testid="topbar-title"]')
      .contains('Drafts')
  })

  describe('Topbar Menu', () => {
    it(`should navigate to "/inbox"`, () => {
      var setLocation = cy.stub()

      cy.mount(<Menu />, {
        setLocation,
      })
        .get('[data-testid="topbar-menu"]')
        .click()
        .get('[data-testid="menu-item-inbox"]')
        .click()
        .then(() => {
          expect(setLocation).to.be.calledOnceWith('/inbox')
        })
    })

    it(`should navigate to "/drafts"`, () => {
      var setLocation = cy.stub()

      cy.mount(<Menu />, {
        setLocation,
      })
        .get('[data-testid="topbar-menu"]')
        .click()
        .get('[data-testid="menu-item-drafts"]')
        .click()
        .then(() => {
          expect(setLocation).to.be.calledOnceWith('/drafts')
        })
    })

    it(`should invoke the quick switcher"`, () => {
      var setLocation = cy.stub()
      var emit = cy.stub()

      cy.mount(<Menu emit={emit} />, {
        setLocation,
      })
        .get('[data-testid="topbar-menu"]')
        .click()
        .get('[data-testid="menu-item-search"]')
        .click()
        .then(() => {
          expect(emit).to.be.calledOnce
        })
    })
  })

  describe('Topbar History Navigation', () => {
    it(`should navigage back`, () => {
      var setLocation = cy.stub()
      var push = {back: cy.stub(), forward: cy.stub()}
      cy.mount(<HistoryButtons push={push} />, {
        setLocation,
      })
        .get('[data-testid="history-back"]')
        .click()
        .get('[data-testid="history-forward"]')
        .click()
        .then(() => {
          expect(push.back).to.be.calledOnce
          expect(push.forward).to.be.calledOnce
        })
    })
  })

  describe.skip('Topbar with Draft', () => {
    it('should render draft title', () => {
      let mockDraft: Document = {
        id: 'foo',
        title: 'draft test',
        author: 'testauthor',
        subtitle: '',
        children: [],
        createTime: new Date(),
        updateTime: undefined,
        publishTime: undefined,
      }

      let {client} = createTestQueryClient({
        draft: mockDraft,
        draftList: [mockDraft],
        authors: [
          {
            id: 'testauthor',
          },
        ],
      })

      cy.mount(<Topbar onLibraryToggle={cy.stub()} />, {
        client,
        path: `/editor/foo`,
      }).get('[data-testid="button-publish"]')
    })
  })

  describe.skip('Topbar with publication', () => {
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

      cy.mount(<Topbar onLibraryToggle={cy.stub()} />, {
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
