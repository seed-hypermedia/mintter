import {BlockHighLighter} from '@app/editor/block-highlighter'
import {Blocktools} from '@app/editor/blocktools'
import {queryKeys} from '@app/hooks'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {globalStyles} from '@app/stitches.config'
import {themeMachine, ThemeProvider} from '@app/theme'
import AppProvider from '@components/app-provider'
import {
  Account,
  Document,
  Info,
  ListDraftsResponse,
  ListPublicationsResponse,
  Publication,
} from '@mintter/shared'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {mockIPC, mockWindows} from '@tauri-apps/api/mocks'
import {useInterpret} from '@xstate/react'
import deepmerge from 'deepmerge'
import {nanoid} from 'nanoid'
import {Suspense} from 'react'
import {MachineOptionsFrom} from 'xstate'

type TestMockData = {
  account?: Partial<Account>
  draft?: Document
  publication?: Publication
  draftList?: Array<Document>
  publicationList?: Array<Publication>
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
        networkMode: 'always',
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
    ? createAccount(mocks.account)
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

  mocks.draftList = mocks.draftList || []
  client.setQueryData<ListDraftsResponse>([queryKeys.GET_DRAFT_LIST], {
    documents: mocks.draftList,
    nextPageToken: '',
  })
  if (mocks.draftList?.length) {
    values.draftList = mocks.draftList
  }

  mocks.publicationList = mocks.publicationList || []
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

  client.invalidateQueries = cy.spy()

  return values
}

export function TestProvider({client, children}: TestProviderProps) {
  let themeService = useInterpret(() => themeMachine)

  // return null
  globalStyles()
  return (
    <QueryClientProvider client={client}>
      <Suspense fallback={<p>Loading...</p>}>
        <ThemeProvider value={themeService}>
          {
            // TODO: @jonas why SearchTermProvider breaks tests?
          }
          <AppProvider>{children}</AppProvider>

          {/* // <Toaster position="bottom-right" /> */}
        </ThemeProvider>
      </Suspense>
    </QueryClientProvider>
  )
}

export type CustomMountOptions = {
  account?: Account
  path?: string
  setLocation?: () => void
  client?: QueryClient
  mainMachineOptions?: MachineOptionsFrom<
    ReturnType<typeof createMainPageService>
  >
}

export type TestProviderProps = CustomMountOptions & {
  children: React.ReactNode
  client: QueryClient
  mainMachineOptions?: MachineOptionsFrom<
    ReturnType<typeof createMainPageService>
  >
}

export function TestPublicationProvider({children}) {
  let mouseService = useInterpret(() => mouseMachine)
  return (
    <div>
      <MouseProvider value={mouseService}>
        <BlockHighLighter>
          <Blocktools>{children}</Blocktools>
        </BlockHighLighter>
      </MouseProvider>
    </div>
  )
}

export function createTestDraft(entry: Partial<Document> = {}): Document {
  return deepmerge(
    {
      id: nanoid(),
      title: 'Test draft Title',
      subtitle: 'Test draft Subtitle',
      createTime: undefined,
      updateTime: undefined,
      children: [],
      author: 'testauthor',
      publishTime: undefined,
    },
    entry,
  )
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

export function createAccount(entry: Partial<Account>): Account {
  return deepmerge(defaultAccount, entry)
}

;(function mockTauriIpc() {
  if (window) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockIPC(() => {})
    mockWindows('test')
  }
})()
