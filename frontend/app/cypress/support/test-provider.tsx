import {AuthProvider} from '@app/auth-context'
import {createAuthService} from '@app/auth-machine'
import {Account, Document, Info} from '@app/client'
import {HoverProvider} from '@app/editor/hover-context'
import {createHoverService} from '@app/editor/hover-machine'
import {queryKeys} from '@app/hooks'
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

  client?.setQueryData<Info>([queryKeys.GET_ACCOUNT_INFO], {
    peerId,
    accountId: account.id,
    startTime: undefined,
  })

  client.setQueryData<Account>([queryKeys.GET_ACCOUNT, ''], account)

  if (mocks.draft) {
    console.log('DRAFT: received a draft')

    client.setQueryData([queryKeys.GET_DRAFT, mocks.draft.id], mocks.draft)
  }
  client.invalidateQueries = cy.spy()

  return {
    client,
    account,
  }
}

export function TestProvider({client, children}: TestProviderProps) {
  let authService = useInterpret(() => createAuthService(client))
  let themeService = useInterpret(() => createThemeService())
  let hoverService = useInterpret(() => createHoverService())
  let bookmarksService = useInterpret(() => createBookmarkListMachine(client))

  // return null
  return (
    <QueryClientProvider client={client}>
      <AuthProvider value={authService}>
        <ThemeProvider value={themeService}>
          <Suspense fallback={<p>Loading...</p>}>
            <HoverProvider value={hoverService}>
              <BookmarksProvider value={bookmarksService}>
                {
                  // TODO: @jonas why SearchTermProvider breaks tests?
                }
                {children}
              </BookmarksProvider>
            </HoverProvider>
            {/* // <Toaster position="bottom-right" /> */}
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
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
