import type {ComponentMeta, ComponentStory} from '@storybook/react'
import {QueryClient, QueryClientProvider} from 'react-query'
import {DocumentList} from './document-list'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
})

export default {
  title: 'Components/DocumentList',
  component: DocumentList,
  decorators: [
    (Story) => {
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      )
    },
  ],
} as ComponentMeta<typeof DocumentList>

export const Default: ComponentStory<typeof DocumentList> = (args) => <DocumentList {...args} />

Default.args = {
  data: [
    {
      document: {
        id: '1',
        title: 'document title',
        subtitle: 'document subtitle',
        author: '456789',
        content: '',
        createTime: undefined,
        updateTime: undefined,
        publishTime: undefined,
      },
    },
  ],
}
