import {AppProviders} from '@app/app-providers'
import {Account, Info, ListAccountsResponse, ListDraftsResponse, ListPublicationsResponse, Profile} from '@app/client'
import {HoverProvider} from '@app/editor/hover-context'
import {hoverMachine} from '@app/editor/hover-machine'
import {queryKeys} from '@app/hooks'
import {MainPageProvider} from '@app/main-page-context'
import {createMainPageMachine} from '@app/main-page-machine'
import {bookmarksMachine, BookmarksProvider} from '@components/bookmarks'
import {createSidepanelMachine, SidepanelProvider} from '@components/sidepanel'
import {mount} from '@cypress/react'
import {useInterpret} from '@xstate/react'
import {PropsWithChildren, ReactNode, useState} from 'react'
import {QueryClient} from 'react-query'

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

export function MainPageProviders({children, client}: PropsWithChildren<{client: QueryClient}>) {
  let sidepanel = useInterpret(() => createSidepanelMachine(client))
  let mainPageService = useInterpret(() => createMainPageMachine(client))
  let hover = useInterpret(() => hoverMachine)
  let bookmarks = useInterpret(() => bookmarksMachine)

  client.setQueryData<ListPublicationsResponse>([queryKeys.GET_PUBLICATION_LIST], {
    publications: [],
    nextPageToken: '',
  })

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
      <HoverProvider value={hover}>
        <BookmarksProvider value={bookmarks}>
          <SidepanelProvider value={sidepanel}>{children}</SidepanelProvider>
        </BookmarksProvider>
      </HoverProvider>
    </MainPageProvider>
  )
}
