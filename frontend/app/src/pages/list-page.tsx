import {useDraftsList} from '@mintter/client/hooks'
import {Text} from '@mintter/ui/text'
import type {UseQueryResult} from 'react-query'
import * as MessageBox from '../components/message-box'
import type {DocumentListData} from '../document-list'
import {DocumentList} from '../document-list'

export type ListPageProps = {
  onCreateDraft: () => void
  useDataHook: () => UseQueryResult<DocumentListData>
}
export function ListPage({onCreateDraft, useDataHook}: ListPageProps) {
  const {status, error, data = []} = useDataHook()

  if (status == 'loading') {
    return <p>loading...</p>
  }

  if (status == 'error') {
    console.error('ListPage error: ', error)
    return <Text>ERROR</Text>
  }

  return (
    <>
      {/* <Seo title="Feed" /> */}
      {data.length == 0 && (
        <MessageBox.Root>
          <MessageBox.Title>No Publications (yet)</MessageBox.Title>
          <MessageBox.Button onClick={onCreateDraft}>
            <Text>Start your first document</Text>
          </MessageBox.Button>
        </MessageBox.Root>
      )}
      <DocumentList data={data} />
    </>
  )
}

export function DraftListPage({onCreateDraft}: Pick<ListPageProps, 'onCreateDraft'>) {
  const {status, error, data = []} = useDraftsList()

  if (status == 'loading') {
    return <p>loading...</p>
  }

  if (status == 'error') {
    console.error('ListPage error: ', error)
    return <Text>ERROR</Text>
  }

  return (
    <>
      {/* <Seo title="Feed" /> */}
      {data?.length == 0 && (
        <MessageBox.Root>
          <MessageBox.Title>No Publications (yet)</MessageBox.Title>
          <MessageBox.Button onClick={onCreateDraft}>
            <Text>Start your first document</Text>
          </MessageBox.Button>
        </MessageBox.Root>
      )}
      <DocumentList data={data} />
    </>
  )
}
