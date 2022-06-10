import {Publication} from '@app/client'
import {ListBookmarksResponse} from '@app/client/bookmarks'
import {queryKeys} from '@app/hooks'
import {mountProviders} from '@app/test/utils'
import {BookmarksSection} from '@components/library/section-bookmarks'

// TODO: fixMe bookmark tests

describe.skip('<BookmarkItem />', () => {
  let pub: Publication = {
    version: 'v1',
    document: {
      id: 'doc1',
      title: 'demo title',
      subtitle: 'demo subtitle',
      author: 'author',
      publishTime: undefined,
      updateTime: undefined,
      children: [],
      createTime: undefined,
    },
  }

  let copyTextToClipboard: any
  beforeEach(() => {
    let {client, render} = mountProviders({
      publication: pub,
      account: {
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
      },
    })

    client.setQueryData<ListBookmarksResponse>(
      [queryKeys.GET_BOOKMARK_LIST],
      ['mtt://doc1/v1/b1'],
    )

    render(<BookmarksSection />)
  })

  it.only('default item', () => {
    cy.get('[data-testid="bookmark-item"]').contains(pub.document!.title)
  })

  it.only('should open boomark in main panel', () => {
    cy.get('[data-testid="bookmark-item"]')
      .get('[data-testid="bookmark-item-title"]')
      .click()
      .then(() => {
        cy.window().then((win) => {
          expect(win.location.pathname).to.equal('/p/doc1/v1/b1')
        })
      })
  })

  it('should open dropdown element', () => {
    cy.get('[data-testid="bookmark-item"]')
      .get('[data-trigger]')
      .click()
      .get('[data-testid="bookmark-item-dropdown-root"]')
      .should('be.visible')
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
      .click({force: true})
      .get('[data-testid="bookmark-item"]')
      .should('not.exist')
  })
})
