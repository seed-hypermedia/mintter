import {ConnectionStatus} from '@mintter/client'
import type {ComponentMeta, ComponentStory} from '@storybook/react'
import {QueryClient, QueryClientProvider} from 'react-query'
import {Connections} from './connections'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
})

export default {
  title: 'Components/Connections',
  component: Connections,
  args: {
    queryOptions: {
      refetchInterval: false,
      retry: false,
    },
  },
} as ComponentMeta<typeof Connections>

type StoryTypes = ComponentStory<typeof Connections>

export const Page: StoryTypes = (args) => {
  queryClient.setQueryData('ListAccounts', {
    accounts: [
      {
        id: '123',
        profile: {
          alias: 'alice',
          email: 'alice@example.com',
          bio: 'alice bio',
        },
        devices: {
          '1234': {
            peerId: '1234',
            registerTime: undefined,
          },
        },
      },
      {
        id: '456',
        profile: {
          alias: 'bob',
          email: 'bob@example.com',
          bio: 'bob bio',
        },
        devices: {
          '5678': {
            peerId: '5678',
            registerTime: undefined,
          },
        },
      },
    ],
    nextPageToken: '',
  })
  queryClient.setQueryData(
    [
      'ConnectionStatus',
      {
        '1234': {
          peerId: '1234',
          registerTime: undefined,
        },
      },
    ],
    {
      addrs: ['/123', '/456'],
      connectionStatus: ConnectionStatus.CONNECTED,
      accountId: '123',
    },
  )

  queryClient.setQueryData(
    [
      'ConnectionStatus',
      {
        '5678': {
          peerId: '5678',
          registerTime: undefined,
        },
      },
    ],
    {
      addrs: ['/654', '/321'],
      connectionStatus: ConnectionStatus.NOT_CONNECTED,
      accountId: '456',
    },
  )
  return (
    <QueryClientProvider client={queryClient}>
      <Connections {...args} />
    </QueryClientProvider>
  )
}

export const EmptyList: StoryTypes = (args) => {
  queryClient.setQueryData('ListAccounts', {
    accounts: [],
    nextPageToken: '',
  })
  return (
    <QueryClientProvider client={queryClient}>
      <Connections {...args} />
    </QueryClientProvider>
  )
}
