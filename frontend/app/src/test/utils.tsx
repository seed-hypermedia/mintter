import {AppProviders} from '@app/app-providers'
import {
  Account,
  Document,
  Info,
  ListAccountsResponse,
  ListDraftsResponse,
  ListPublicationsResponse,
  Publication,
} from '@app/client'
import {HoverProvider} from '@app/editor/hover-context'
import {HoverContext} from '@app/editor/hover-machine'
import {FilesProvider} from '@app/files-context'
import {createFilesMachine, FilesContext} from '@app/files-machine'
import {queryKeys} from '@app/hooks'
import {MainPageProvider} from '@app/main-page-context'
import {
  createMainPageService,
  defaultMainPageContext,
  MainPageContext,
} from '@app/main-page-machine'
import {DeepPartial} from '@app/types'
import {
  BookmarkListContext,
  BookmarksProvider,
  createBookmarkListMachine,
} from '@components/bookmarks'
import {mount} from '@cypress/react'
import {useInterpret} from '@xstate/react'
import {PropsWithChildren, ReactNode, useState} from 'react'
import {QueryClient} from 'react-query'
import {MachineOptionsFrom} from 'xstate'
;(function mockTauriIpc() {
  if (window) {
    window.__TAURI_IPC__ = function mockTAURI_IPC() {
      // noob
    }
  }
})()

export const memoryLocation =
  (path = '/') =>
  () =>
    useState(path)

export const customHookWithReturn =
  (initialPath = '/') =>
  () => {
    const [path, updatePath] = useState(initialPath)
    const navigate = (path: string) => {
      updatePath(path)
      return 'foo'
    }

    return [path, navigate]
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

  client ||= new QueryClient({
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
    return mount(
      <AppProviders client={client} initialRoute={initialRoute}>
        {ui}
      </AppProviders>,
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

type MainPageProvidersProps = PropsWithChildren<{
  client: QueryClient
  hoverContext?: HoverContext
  bookmarkListContext?: BookmarkListContext
  mainPageContext?: DeepPartial<MainPageContext>
  mainPageOptions?: MachineOptionsFrom<ReturnType<typeof createMainPageService>>
  filesContext?: Partial<FilesContext>
  route?: string
}>

export function MainPageProviders({
  children,
  client,
  hoverContext = {blockId: null},
  bookmarkListContext = {bookmarks: [], errorMessage: ''},
  mainPageContext = {params: {}},
  mainPageOptions = {},
  filesContext = {},
  route = '/',
}: MainPageProvidersProps) {
  let filesService = useInterpret(() =>
    createFilesMachine(client).withContext({
      publicationList: [],
      draftList: [],
      currentFile: null,
      errorMessage: '',
      ...filesContext,
    }),
  )
  let mainPageService = useInterpret(
    () =>
      createMainPageService(client, route).withContext(
        defaultMainPageContext(mainPageContext),
      ),
    {
      ...mainPageOptions,
      actions: {
        ...mainPageOptions.actions,
      },
    },
  )

  let hover = useInterpret(() => hoverMachine.withContext(hoverContext))
  let bookmarks = useInterpret(() =>
    createBookmarkListMachine(client).withContext(bookmarkListContext),
  )

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

  return (
    <MainPageProvider value={mainPageService}>
      <FilesProvider value={filesService}>
        <HoverProvider value={hover}>
          <BookmarksProvider value={bookmarks}>{children}</BookmarksProvider>
        </HoverProvider>
      </FilesProvider>
    </MainPageProvider>
  )
}
