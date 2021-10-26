import {Text} from '@mintter/ui/text'
import type {UseQueryResult} from 'react-query'
import type {DocumentListData} from '../components/document-list'
import {DocumentList, DummyListItem} from '../components/document-list'
import * as MessageBox from '../components/message-box'
import {HookOptions, useDraftList} from '../hooks'

export type ListPageProps = {
  onCreateDraft: () => void
  useDataHook: (opts?: HookOptions<DocumentListData>) => UseQueryResult<DocumentListData>
}
export function ListPage({onCreateDraft, useDataHook}: ListPageProps) {
  const {status, data = []} = useDataHook()

  if (status == 'loading') {
    return (
      <>
        <DummyListItem />
        <DummyListItem />
        <DummyListItem />
      </>
    )
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
  const {status, data = []} = useDraftList()

  if (status == 'loading') {
    return (
      <>
        <DummyListItem />
        <DummyListItem />
        <DummyListItem />
      </>
    )
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
