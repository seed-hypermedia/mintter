import {DocumentList} from '../document-list'
import {Text} from '@mintter/ui'
import * as MessageBox from '../components/message-box'

export type ListPageProps = {
  onCreateDraft: () => void
  useDataHook: () => any
}
export function ListPage({onCreateDraft, useDataHook}: ListPageProps) {
  const {isLoading, isError, error, data = []} = useDataHook()

  if (isLoading) {
    return <p>loading...</p>
  }

  if (isError) {
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
      <DocumentList isLoading={isLoading} isError={isError} error={error} data={data as any} />
    </>
  )
}
