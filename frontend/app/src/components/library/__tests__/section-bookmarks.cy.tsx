import { Account, ListDraftsResponse, ListPublicationsResponse } from '@app/client'
import { ListBookmarksResponse } from '@app/client/bookmarks'
import { queryKeys } from '@app/hooks'
import { MainPageProviders, mountWithAccount } from '@app/test/utils'
import { BookmarksSection } from '@components/library/section-bookmarks'
import { group, paragraph, statement, text } from '@mintter/mttast'
import { setLogger } from 'react-query'

setLogger({
  log: console.log,
  warn: console.warn,
  // ✅ no more errors on the console
  error: () => {
    // noop
  },
})

describe.only('<BookmarkItem />', () => {
  let pub = {
    version: 'v1',
    latestVersion: 'v1',
    document: {
      id: 'doc1',
      title: 'demo title',
      subtitle: 'demo subtitle',
      author: 'author',
      content: [group([statement({ id: 'b1' }, [paragraph([text('Hello World')])])])],
      publishTime: undefined,
      updateTime: undefined,
      children: [],
      createTime: undefined,
    },
  }

  let copyTextToClipboard: any
  beforeEach(() => {
    let { client, render } = mountWithAccount()

    client.setQueryData<ListPublicationsResponse>([queryKeys.GET_PUBLICATION_LIST], {
      publications: [],
      nextPageToken: '',
    })

    client.setQueryData<ListDraftsResponse>([queryKeys.GET_DRAFT_LIST], {
      documents: [],
      nextPageToken: '',
    })

    client.setQueryData<ListBookmarksResponse>([queryKeys.GET_BOOKMARK_LIST], ['mtt://doc1/v1/b1'])

    client.setQueryData([queryKeys.GET_PUBLICATION, pub.document.id, pub.version], pub)

    client.setQueryData<Account>([queryKeys.GET_ACCOUNT, pub.document.author], {
      id: 'author',
      profile: {
        alias: 'demo',
        bio: 'demo',
        email: 'demo@d.com',
      },
      devices: {
        foo: {
          peerId: 'foo',
        },
      },
    })

    render(
      <MainPageProviders client={client}>
        <BookmarksSection />
      </MainPageProviders>,
    )

    cy.get('[data-testid="bookmarks-section-trigger"]').click({ force: true })
  })

  it('default item', () => {
    cy.get('[data-testid="bookmark-item"]').contains(pub.document.title)
  })

  it('should open dropdown element', () => {
    cy.get('[data-testid="bookmark-item"]')
      .get('[data-trigger]')
      .click()
      .get('[data-testid="bookmark-item-dropdown-root"]')
      .should('be.visible')
  })

  it('should Open in Sidepanel', () => {
    cy.get('[data-testid="bookmark-item"]')
      .get('[data-trigger]')
      .click()
      .get('[data-testid="sidepanel-item"]')
      .should('be.visible')
      .contains('Open in sidepanel')
      .click()
  })

  it('should delete bookmark', () => {
    cy.get('[data-testid="bookmark-item"]')
      .get('[data-trigger]')
      .click()
      .get('[data-testid="delete-item"]')
      .should('be.visible')
      .click()
      .get('[data-testid="delete-dialog-title"]')
      .should('be.visible')
      .contains(/Delete bookmark/i)
      .get('[data-testid="delete-dialog-cancel"]')
      .should('be.visible')
      .should('be.enabled')
      .get('[data-testid="delete-dialog-confirm"]')
      .should('be.visible')
      .should('be.enabled')
      .click()
      .get('[data-testid="bookmark-item"]')
      .should('not.exist')
  })

  it('should clear all', () => {
    cy.get('[data-testid="bookmark-item"]')
      .should('exist')
      .get('[data-testid="clear-bookmarks"]')
      .click({ force: true })
      .get('[data-testid="bookmark-item"]')
      .should('not.exist')
  })
})
