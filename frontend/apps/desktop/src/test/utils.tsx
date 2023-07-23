import {queryKeys} from '@mintter/app/src/models/query-keys'
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
import deepmerge from 'deepmerge'
import {nanoid} from 'nanoid'
import {Suspense} from 'react'
import {NavState} from '@mintter/app/src/utils/navigation'

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

  let deviceId = 'testDeviceId'
  let defaultAccount = new Account({
    id: 'testAccountId',
    profile: {
      alias: 'demo',
      avatar: 'bafkreibaejvf3wyblh3s4yhbrwtxto7wpcac7zkkx36cswjzjez2cbmzvu',
      bio: 'demo bio',
    },
    devices: {
      [deviceId]: {
        deviceId: deviceId,
      },
    },
  })

  let defaultInfo: Partial<Info> = {
    deviceId: deviceId,
    startTime: undefined,
  }

  let account = mocks.account ? createAccount(mocks.account) : defaultAccount

  let info = mocks.info
    ? (deepmerge(defaultInfo, {
        ...mocks.info,
        accountId: account.id,
      }) as Info)
    : (defaultInfo as Info)

  values.account = account
  values.info = info

  client.setQueryData<Account>([queryKeys.GET_ACCOUNT, ''], account)
  client.setQueryData<Info>([queryKeys.GET_DAEMON_INFO], info)

  client.setQueryData<Info>([queryKeys.GET_DAEMON_INFO], info)

  if (mocks.draft) {
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
  // @ts-ignore
  client.setQueryData<ListDraftsResponse>([queryKeys.GET_DRAFT_LIST], {
    documents: mocks.draftList,
    nextPageToken: '',
  })
  if (mocks.draftList?.length) {
    values.draftList = mocks.draftList
  }

  mocks.publicationList = mocks.publicationList || []
  //@ts-ignore
  client.setQueryData<ListPublicationsResponse>(
    [queryKeys.GET_PUBLICATION_LIST],
    new ListPublicationsResponse({
      nextPageToken: '',
      publications: mocks.publicationList,
    }),
  )

  let authors = mocks.authors
    ? mocks.authors.map((a, idx) =>
        deepmerge(
          {
            id: `authorId-${idx + 1}`,
            profile: {
              alias: `alias-${idx + 1}`,
              avatar: `bafkreibaejvf3wyblh3s4yhbrwtxto7wpcac7zkkx36cswjzjez2cbmzvu`,
              bio: `bio for user ${idx + 1}`,
            },
            devices: {
              d1: {
                deviceId: 'd1',
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

  //@ts-ignore
  client.invalidateQueries = cy.spy()

  return values
}

export function TestProvider({client, children}: TestProviderProps) {
  return (
    <QueryClientProvider client={client}>
      <Suspense fallback={<p>Loading...</p>}>{children}</Suspense>
    </QueryClientProvider>
  )
}

export type CustomMountOptions = {
  account?: Account
  nav?: NavState
  setLocation?: () => void
  client?: QueryClient
}

export type TestProviderProps = CustomMountOptions & {
  children: React.ReactNode
  client: QueryClient
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

let deviceId = 'testDeviceId'
let defaultAccount = {
  id: 'testAccountId',
  profile: {
    alias: 'demo',
    avatar: 'bafkreibaejvf3wyblh3s4yhbrwtxto7wpcac7zkkx36cswjzjez2cbmzvu',
    bio: 'demo bio',
  },
  devices: {
    [deviceId]: {
      deviceId: deviceId,
    },
  },
}

export function createAccount(entry: Partial<Account>): Account {
  return new Account(deepmerge(defaultAccount, entry))
}

;(function mockTauriIpc() {
  if (window) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockIPC(() => {})
    mockWindows('test')
  }
})()
