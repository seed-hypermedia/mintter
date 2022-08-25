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

  let account: Account = mocks.account
    ? deepmerge(defaultAccount, mocks.account)
    : defaultAccount

  values.account = account

  client?.setQueryData<Info>([queryKeys.GET_ACCOUNT_INFO], {
    peerId,
    accountId: account.id,
    startTime: undefined,
  })

  client.setQueryData<Account>([queryKeys.GET_ACCOUNT, ''], account)

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
  client?: QueryClient
}

export type TestProviderProps = CustomMountOptions & {
  children: React.ReactNode
  client: QueryClient
}

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
