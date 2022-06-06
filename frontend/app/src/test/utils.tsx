import {AppProviders} from '@app/app-providers'
import {
  Account,
  Info,
  ListAccountsResponse,
  ListDraftsResponse,
  ListPublicationsResponse,
  Profile,
} from '@app/client'
import {HoverProvider} from '@app/editor/hover-context'
import {HoverContext, hoverMachine} from '@app/editor/hover-machine'
import {FilesProvider} from '@app/files-context'
import {createFilesMachine} from '@app/files-machine'
import {queryKeys} from '@app/hooks'
import {MainPageProvider} from '@app/main-page-context'
import {createMainPageMachine, MainPageContext} from '@app/main-page-machine'
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

export function mountWithAccount({
  client,
  accountId,
  profile,
}: {
  client?: QueryClient
  accountId?: string
  profile?: Profile
} = {}) {
  accountId ||= 'testaccountid'
  profile ||= {
    alias: 'demo',
    email: 'test@demo.com',
    bio: 'demo bio',
  }

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

  client.setQueryData<Info>([queryKeys.GET_ACCOUNT_INFO], {
    peerId: 'testpeerid',
    accountId,
    startTime: undefined,
  })

  client.setQueryData<Account>([queryKeys.GET_ACCOUNT, ''], {
    id: accountId,
    profile,
    devices: {
      foo: {
        peerId: 'foopeerid',
      },
    },
  })

  client.invalidateQueries = cy.spy()

  function render(ui: ReactNode) {
    return mount(<AppProviders client={client}>{ui}</AppProviders>)
  }

  return {
    client,
    render,
    accountId,
    profile,
  }
}

type MainPageProvidersProps = PropsWithChildren<{
  client: QueryClient
  hoverContext?: HoverContext
  bookmarkListContext?: BookmarkListContext
  mainPageContext?: DeepPartial<MainPageContext>
  mainPageOptions?: MachineOptionsFrom<ReturnType<typeof createMainPageMachine>>
}>

export function MainPageProviders({
  children,
  client,
  hoverContext = {blockId: null},
  bookmarkListContext = {bookmarks: [], errorMessage: ''},
  mainPageContext = {params: {}},
  mainPageOptions = {},
}: MainPageProvidersProps) {
  let filesService = useInterpret(() => createFilesMachine(client))
  let mainPageService = useInterpret(
    () => createMainPageMachine(filesService).withContext(mainPageContext),
    {
      ...mainPageOptions,
      actions: {
        ...mainPageOptions.actions,
        loadDraft: (_, event) => {
          filesService.send({type: 'LOAD.DRAFT', ref: event.ref})
        },
        loadPublication: (_, event) => {
          filesService.send({type: 'LOAD.PUBLICATION', ref: event.ref})
        },
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
