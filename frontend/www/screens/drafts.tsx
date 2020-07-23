import {useHistory} from 'react-router-dom'
import Seo from 'components/seo'
import NoteAddOutlinedIcon from '@material-ui/icons/NoteAddOutlined'
import DocumentList from 'components/documentList'
import {useMintter} from 'shared/mintterContext'

export function Drafts() {
  const router = useHistory()

  const {createDraft, allDrafts, deleteDraft} = useMintter()

  const {status, error, resolvedData} = allDrafts()

  async function handleCreateDraft() {
    const p = await createDraft()
    const draft = p.toObject()
    router.push({
      pathname: `/editor/${draft.documentId}`,
    })
  }

  async function handleDeleteDraft(id: string) {
    await deleteDraft(id)
  }

  return (
    <>
      <Seo title="Drafts" />
      {status === 'success' && resolvedData.toObject().draftsList.length === 0 && (
        <>
          <hr className="border-t-2 border-muted border-solid my-8" />
          <div className="bg-background-muted border-muted border-solid border-2 rounded px-8 pt-6 pb-8 mb-4 text-center flex flex-col items-center">
            <h3 className="text-xl font-semibold text-primary">
              No Drafts available
            </h3>
            {/* <p className="text-body font-light mt-5">
                Some clain sentence that's fun, welcomes user to the community
                and tells how it works and encourages to get started
              </p> */}
            <button
              onClick={handleCreateDraft}
              className="bg-primary hover:shadow-lg text-white font-bold py-3 px-4 rounded-full flex items-center mt-5 justify-center"
            >
              <NoteAddOutlinedIcon />
              <span className="ml-2">Start writing your first document</span>
            </button>
          </div>
        </>
      )}

      <DocumentList
        status={status}
        error={error}
        data={resolvedData?.toObject().draftsList}
        onDraftDelete={handleDeleteDraft}
      />
    </>
  )
}
