import {DocumentList} from '../document-list'
import {deleteDraft} from '@mintter/client'
import toast from 'react-hot-toast'
import {useDraftsList} from '@mintter/client/hooks'
import {useHistory, useRouteMatch} from 'react-router'
import type {WithCreateDraft} from './library'
import * as MessageBox from '../components/message-box'
import {useQueryClient} from 'react-query'
import {AppSpinner} from '../components/app-spinner'

export const Drafts = ({onCreateDraft}: WithCreateDraft): JSX.Element => {
  const history = useHistory()
  const match = useRouteMatch()
  const queryClient = useQueryClient()
  const {isLoading, isError, isSuccess, error, data} = useDraftsList()

  async function handleDeleteDocument(documentId: string) {
    await deleteDraft(documentId)
    await queryClient.invalidateQueries('DraftList')
    toast.success(`Draft successfully deleted`)
  }

  if (isError) {
    toast.error('something went wrong!', {duration: 6000})
    return <p>Drafts ERROR</p>
  }

  if (isLoading) {
    return <AppSpinner />
  }

  return (
    <>
      {/* <Seo title="Drafts" /> */}
      {isSuccess && data?.length === 0 && (
        <MessageBox.Root>
          <MessageBox.Title>No Drafts available</MessageBox.Title>
          <MessageBox.Button onClick={onCreateDraft}>
            <span>Start your first document</span>
          </MessageBox.Button>
        </MessageBox.Root>
      )}

      <DocumentList
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data}
        onDeletePublication={handleDeleteDocument}
      />
    </>
  )
}
