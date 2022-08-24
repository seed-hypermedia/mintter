import {AppProvider} from '@app/app-providers'
import {
  Account,
  Document,
  Info,
  ListAccountsResponse,
  ListDraftsResponse,
  ListPublicationsResponse,
  Publication,
} from '@app/client'
import {queryKeys} from '@app/hooks'
import {RootProvider} from '@app/root'
import {ReactNode} from 'react'
import {QueryClient} from 'react-query'
;(function mockTauriIpc() {
  if (window) {
    window.__TAURI_IPC__ = function mockTAURI_IPC() {
      // noob
    }
  }
})()

export function createTestQueryClient() {
  return new QueryClient({
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
}

type MountProvidersProps = {
  client?: QueryClient
  account?: Account
  accountList?: Array<Account>
  draftList?: Array<Document>
  draft?: Document
  publication?: Publication
  publicationList?: Array<Publication>
  initialRoute?: string
}

export function mountProviders({
  client,
  account,
  accountList,
  draft,
  draftList,
  publication,
  publicationList,
  initialRoute,
}: MountProvidersProps = {}) {
  let peerId = 'testPeerId'

  client ||= createTestQueryClient()

  account ||= {
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

  client.setQueryData<Info>([queryKeys.GET_ACCOUNT_INFO], {
    peerId,
    accountId: account.id,
    startTime: undefined,
  })

  client.setQueryData<Account>([queryKeys.GET_ACCOUNT, ''], account)

  accountList ||= []

  client.setQueryData<ListAccountsResponse>([queryKeys.GET_ACCOUNT_LIST], {
    accounts: accountList,
    nextPageToken: '',
  })

  draftList ||= draft ? [draft] : []

  client.setQueryData<ListDraftsResponse>([queryKeys.GET_DRAFT_LIST], {
    documents: draftList,
    nextPageToken: '',
  })

  if (draft) {
    client.setQueryData<Document>([queryKeys.GET_DRAFT, draft.id], {
      ...draft,
      author: account.id,
    })
  }

  publicationList ||= publication ? [publication] : []

  client.setQueryData<ListPublicationsResponse>(
    [queryKeys.GET_PUBLICATION_LIST],
    {
      publications: publicationList,
      nextPageToken: '',
    },
  )

  if (publication) {
    client.setQueryData<Publication>(
      [
        queryKeys.GET_PUBLICATION,
        publication.document?.id,
        publication.version,
      ],
      {
        ...publication,
        document: {
          ...publication.document,
          author: account.id,
        },
      },
    )
  }

  client.invalidateQueries = cy.spy()

  function render(ui: ReactNode) {
    return cy.mount(
      <RootProvider client={client}>
        <AppProvider initialRoute={initialRoute}>{ui}</AppProvider>
      </RootProvider>,
    )
  }

  return {
    client,
    account,
    draftList,
    publicationList,
    draft,
    publication,
    render,
  }
}
