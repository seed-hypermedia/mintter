import {ListAccountsResponse, ListDraftsResponse, ListPublicationsResponse, Publication} from '@app/client'
import {queryKeys} from '@app/hooks'
import {mountWithAccount} from '@app/test/utils'
import {Box} from '@components/box'
import {createSidepanelMachine, Sidepanel, SidepanelProvider} from '@components/sidepanel'
import {useInterpret} from '@xstate/react'
import {PropsWithChildren} from 'react'
import {QueryClient} from 'react-query'

describe('<Sidepanel />', () => {
  it('should work', () => {
    const {render, client} = mountWithAccount()

    let pub = {
      version: '1',
      latestVersion: '1',
      document: {
        id: 'foo',
        title: 'demo title',
        subtitle: 'demo subtitle',
        author: 'author',
        content: '',
        publishTime: undefined,
        updateTime: undefined,
        children: [],
        createTime: undefined,
      },
    }

    client.setQueryData<ListPublicationsResponse>([queryKeys.GET_PUBLICATION_LIST], {
      publications: [pub],
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

    client.setQueryData<Publication>([queryKeys.GET_PUBLICATION, pub.document.id], pub)

    render(
      <SidepanelTestProvider client={client}>
        <Sidepanel />
      </SidepanelTestProvider>,
    )
  })
})

function SidepanelTestProvider({children, client}: PropsWithChildren<{client: QueryClient}>) {
  const sidepanel = useInterpret(() => createSidepanelMachine(client))

  return (
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
        <button onClick={() => sidepanel.send('SIDEPANEL.TOGGLE')}>sidepanel</button>
        {children}
      </Box>
    </SidepanelProvider>
  )
}
