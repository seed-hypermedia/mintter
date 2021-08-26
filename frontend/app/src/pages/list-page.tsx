import {DocumentList} from '../document-list'
import {Text} from '@mintter/ui'
import * as MessageBox from '../components/message-box'

export type ListPageProps = {
  onCreateDraft: () => void
  useDataHook: () => {data: Array<Document>; status: string; error: any}
}
export function ListPage({onCreateDraft, useDataHook}: ListPageProps) {
  console.log('🚀 ~ file: list-page.tsx ~ line 10 ~ ListPage ~ useDataHook', useDataHook)
  const {status, error, data = []} = useDataHook()

  if (status === 'loading') {
    return <p>loading...</p>
  }

  if (status === 'error') {
    console.error('ListPage error: ', error)
    return <p>ERROR</p>
  }

  return (
    <>
      {/* <Seo title="Feed" /> */}
      {data?.length === 0 && (
        <MessageBox.Root>
          <MessageBox.Title>No Publications (yet)</MessageBox.Title>
          <MessageBox.Button onClick={onCreateDraft}>
            <Text>Start your first document</Text>
          </MessageBox.Button>
        </MessageBox.Root>
      )}
      {/* TODO: fix data type */}
      <DocumentList status={status} error={error} data={data} />
    </>
  )
}
