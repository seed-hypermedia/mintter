import type {UseQueryResult} from 'react-query'
import type {Publication} from '@mintter/client'
import {DocumentList} from '../document-list'
import {Text} from '@mintter/ui'
import * as MessageBox from '../components/message-box'

export type ListPageProps = {
  onCreateDraft: () => void
  useDataHook: () => UseQueryResult<Array<{document: Document} | Partial<Publication>>>
}
export function ListPage({onCreateDraft, useDataHook}: ListPageProps) {
  const {status, error, data = []} = useDataHook()
  console.log('🚀 ~ file: list-page.tsx ~ line 13 ~ ListPage ~ status, error, data', status, error, data)

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
      <DocumentList status={status} error={error} data={data} />
    </>
  )
}
