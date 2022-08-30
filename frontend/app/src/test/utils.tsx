import {AuthProvider} from '@app/auth-context'
import {createAuthService} from '@app/auth-machine'
import {
  Account,
  Document,
  Info,
  ListDraftsResponse,
  ListPublicationsResponse,
  Publication,
} from '@app/client'
import {BlockToolsProvider} from '@app/editor/block-tools-context'
import {blockToolsMachine} from '@app/editor/block-tools-machine'
import {HoverProvider} from '@app/editor/hover-context'
import {createHoverService} from '@app/editor/hover-machine'
import {queryKeys} from '@app/hooks'
import {MainProvider} from '@app/main-context'
import {createMainPageService} from '@app/main-machine'
import {createThemeService, ThemeProvider} from '@app/theme'
import {
  BookmarksProvider,
  createBookmarkListMachine,
} from '@components/bookmarks'
import {useInterpret} from '@xstate/react'
import deepmerge from 'deepmerge'
import {Suspense} from 'react'
import {QueryClient, QueryClientProvider} from 'react-query'

type TestMockData = {
  account?: Partial<Account>
  draft?: Document
  publication?: Publication
  draftList?: Array<Document>
  publicationList?: Array<Publication>
  bookmarks?: Array<string>
  info?: Partial<Info>
  authors?: Array<Partial<Account>>
  url?: string
}

type TestClientReturn = TestMockData & {
  client: QueryClient
}

export function createTestQueryClient(mocks: TestMockData = {}) {
  let client = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: false,
        retryOnMount: false,
        staleTime: Infinity,
      },
    },
  })

  let values: TestClientReturn = {
    client,
  }

  let peerId = 'testPeerID'
  let defaultAccount = {
    id: 'testAccountId',
    profile: {
      alias: 'demo',
      email: 'test@demo.com',
      bio: 'demo bio',
    },
    devices: {
      [peerId]: {
        peerId,
      },
    },
  }

  let defaultInfo: Partial<Info> = {
    peerId,
    startTime: undefined,
  }

  let account: Account = mocks.account
    ? deepmerge(defaultAccount, mocks.account)
    : defaultAccount

  let info = mocks.info
    ? (deepmerge(defaultInfo, {
        ...mocks.info,
        accountId: account.id,
      }) as Info)
    : (defaultInfo as Info)

  values.account = account
  values.info = info

  client.setQueryData<Account>([queryKeys.GET_ACCOUNT, ''], account)
  client.setQueryData<Info>([queryKeys.GET_ACCOUNT_INFO], info)
  client.setQueryData<Array<string>>(
    [queryKeys.GET_PEER_ADDRS, peerId],
    ['foo', 'bar'],
  )

  client.setQueryData<Array<string>>(
    [queryKeys.GET_PEER_ADDRS, info.accountId],
    ['foo', 'bar'],
  )

  if (mocks.draft) {
    client.setQueryData([queryKeys.GET_DRAFT, mocks.draft.id], mocks.draft)
    values.draft = mocks.draft
  }

  if (mocks.publication) {
    client.setQueryData(
      [
        queryKeys.GET_PUBLICATION,
        mocks.publication.document?.id,
        mocks.publication.version,
      ],
      mocks.publication,
    )
    values.publication = mocks.publication
  }

  mocks.draftList ||= []
  client.setQueryData<ListDraftsResponse>([queryKeys.GET_DRAFT_LIST], {
    documents: mocks.draftList,
    nextPageToken: '',
  })
  if (mocks.draftList?.length) {
    values.draftList = mocks.draftList
  }

  mocks.publicationList ||= []
  client.setQueryData<ListPublicationsResponse>(
    [queryKeys.GET_PUBLICATION_LIST],
    {
      nextPageToken: '',
      publications: mocks.publicationList,
    },
  )

  let authors = mocks.authors
    ? mocks.authors.map((a, idx) =>
        deepmerge(
          {
            id: `authorId-${idx + 1}`,
            profile: {
              alias: `alias-${idx + 1}`,
              email: `user-${idx + 1}@user.com`,
              bio: `bio for user ${idx + 1}`,
            },
            devices: {
              d1: {
                peerId: 'd1',
              },
            },
          },
          a,
        ),
      )
    : []

  authors.forEach((a) => {
    client.setQueryData<Account>([queryKeys.GET_ACCOUNT, a.id], a)
  })

  values.authors = authors

  if (mocks.publicationList?.length) {
    values.publicationList = mocks.publicationList
  }

  mocks.bookmarks ||= []
  client.setQueryData([queryKeys.GET_BOOKMARK_LIST], mocks.bookmarks)

  if (mocks.bookmarks) {
    values.bookmarks = mocks.bookmarks
  }

  client.invalidateQueries = cy.spy()

  return values
}

export function TestProvider({client, children}: TestProviderProps) {
  let authService = useInterpret(() => createAuthService(client))
  let themeService = useInterpret(() => createThemeService())
  let hoverService = useInterpret(() => createHoverService())
  let bookmarksService = useInterpret(() => createBookmarkListMachine(client))
  let mainService = useInterpret(() => createMainPageService({client}))

  // return null
  return (
    <QueryClientProvider client={client}>
      <Suspense fallback={<p>Loading...</p>}>
        <ThemeProvider value={themeService}>
          <AuthProvider value={authService}>
            <MainProvider value={mainService}>
              <HoverProvider value={hoverService}>
                <BookmarksProvider value={bookmarksService}>
                  {
                    // TODO: @jonas why SearchTermProvider breaks tests?
                  }
                  {children}
                </BookmarksProvider>
              </HoverProvider>
              {/* // <Toaster position="bottom-right" /> */}
            </MainProvider>
          </AuthProvider>
        </ThemeProvider>
      </Suspense>
    </QueryClientProvider>
  )
}

export type CustomMountOptions = {
  account?: Account
  path?: string
  client?: QueryClient
}

export type TestProviderProps = CustomMountOptions & {
  children: React.ReactNode
  client: QueryClient
}

export function TestPublicationProvider({children}) {
  const blockToolsService = useInterpret(() => blockToolsMachine)
  return (
    <BlockToolsProvider value={blockToolsService}>
      {children}
    </BlockToolsProvider>
  )
}

;(function mockTauriIpc() {
  if (window) {
    window.TAURI_IPC = function () {
      // noop
    }
    window.__TAURI_IPC__ = function TauriIPCMock() {
      // noop
    }
    window.__TAURI_METADATA__ = {
      __currentWindow: {
        label: 'test',
      },
      __windows: [
        {
          label: 'test',
        },
      ],
    }
  }
})()
