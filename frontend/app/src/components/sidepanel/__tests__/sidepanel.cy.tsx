import {
  Account,
  ListAccountsResponse,
  ListDraftsResponse,
  ListPublicationsResponse,
  ListSidepanelResponse,
} from '@app/client'
import {HoverProvider} from '@app/editor/hover-context'
import {hoverMachine} from '@app/editor/hover-machine'
import {queryKeys} from '@app/hooks'
import {MainPageProviders, mountWithAccount} from '@app/test/utils'
import {
  BookmarksProvider,
  createBookmarkListMachine,
} from '@components/bookmarks'
import {Box} from '@components/box'
import {
  createSidepanelMachine,
  Sidepanel,
  SidepanelProvider,
} from '@components/sidepanel'
import {group, paragraph, statement, text} from '@mintter/mttast'
import {useInterpret} from '@xstate/react'
import {PropsWithChildren} from 'react'
import {QueryClient} from 'react-query'

describe('<Sidepanel />', () => {
  let pub = {
    version: 'v1',
    latestVersion: 'v1',
    document: {
      id: 'doc1',
      title: 'demo title',
      subtitle: 'demo subtitle',
      author: 'author',
      content: [
        group([statement({id: 'b1'}, [paragraph([text('Hello World')])])]),
      ],
      publishTime: undefined,
      updateTime: undefined,
      children: [],
      createTime: undefined,
    },
  }

  let copyTextToClipboard: any

  beforeEach(() => {
    const {render, client} = mountWithAccount()

    client.setQueryData<ListPublicationsResponse>(
      [queryKeys.GET_PUBLICATION_LIST],
      {
        publications: [],
        nextPageToken: '',
      },
    )

    client.setQueryData<ListDraftsResponse>([queryKeys.GET_DRAFT_LIST], {
      documents: [],
      nextPageToken: '',
    })

    client.setQueryData<ListAccountsResponse>([queryKeys.GET_ACCOUNT_LIST], {
      accounts: [],
      nextPageToken: '',
    })

    client.setQueryData(
      [queryKeys.GET_PUBLICATION, pub.document.id, pub.version],
      pub,
    )

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

    client.setQueryData<ListSidepanelResponse>([queryKeys.GET_SIDEPANEL_LIST], {
      items: [
        {
          type: 'block',
          url: 'mtt://doc1/v1/b1',
        },
      ],
    })

    copyTextToClipboard = cy.stub().resolves()

    render(
      <MainPageProviders client={client}>
        <SidepanelTestProvider client={client}>
          <Sidepanel copy={copyTextToClipboard} />
        </SidepanelTestProvider>
      </MainPageProviders>,
    )
  })

  it('Should render Sidepanel Item', () => {
    cy.get('#trigger')
      .click()
      .get('[data-testid="sidepanel-item"]')
      .should('have.length', 1)
      .get('[data-testid="sidepanel-item-type"]')
      .contains('Block')
      .get('[data-element-type="paragraph"]')
      .contains('Hello World')
  })

  it('should render dropdown menu', () => {
    cy.get('#trigger')
      .click()
      .get('[data-testid="sidepanel-item"] [data-trigger]')
      .click()
      .get('[data-testid="sidepanel-dropdown-content"]')
      .should('be.visible')
  })

  it('should copy to clipboard', () => {
    cy.get('#trigger')
      .click()
      .get('[data-testid="sidepanel-item"] [data-trigger]')
      .click()
      .get('[data-testid="copy-item"]')
      .click()
      .then(() => {
        expect(copyTextToClipboard).to.have.been.calledOnce
        expect(copyTextToClipboard).to.have.been.calledWith(`mtt://doc1/v1/b1`)
      })
  })

  it('should delete item', () => {
    cy.get('#trigger')
      .click()
      .get('[data-testid="sidepanel-item"] [data-trigger]')
      .click()
      .get('[data-testid="delete-item"]')
      .click()
      .get('[data-testid="delete-dialog-title"]')
      .should('be.visible')
      .contains(/Delete item/i)
      .get('[data-testid="delete-dialog-cancel"]')
      .should('be.visible')
      .should('be.enabled')
      .get('[data-testid="delete-dialog-confirm"]')
      .should('be.visible')
      .should('be.enabled')
      .click()
      .get('[data-testid="sidepanel-item"]')
      .should('not.exist')
  })
})

function SidepanelTestProvider({
  children,
  client,
}: PropsWithChildren<{client: QueryClient}>) {
  const sidepanel = useInterpret(() => createSidepanelMachine(client))
  const bookmarks = useInterpret(() => createBookmarkListMachine(client))
  const hover = useInterpret(() => hoverMachine)
  return (
    <HoverProvider value={hover}>
      <BookmarksProvider value={bookmarks}>
        <SidepanelProvider value={sidepanel}>
          <Box
            css={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              display: 'grid',
              overflow: 'hidden',
              gridAutoFlow: 'column',
              gridAutoColumns: '1fr',
              gridTemplateRows: '48px 1fr',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 0,
              gridTemplateAreas: `"topbar topbar topbar"
          "library main sidepanel"`,
              background: '$background-default',
            }}
          >
            <button
              id="trigger"
              onClick={() => sidepanel.send('SIDEPANEL.TOGGLE')}
            >
              sidepanel
            </button>
            {children}
          </Box>
        </SidepanelProvider>
      </BookmarksProvider>
    </HoverProvider>
  )
}
