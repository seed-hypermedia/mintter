import {useHistory} from 'react-router-dom'
import Seo from 'components/seo'
import NoteAddOutlinedIcon from '@material-ui/icons/NoteAddOutlined'
import DocumentList from 'components/documentList'
import {useMintter} from 'shared/mintterContext'

export function Drafts() {
  const router = useHistory()

  const {createDraft, allDrafts} = useMintter()

  const {status, error, resolvedData} = allDrafts()

  async function handleCreateDraft() {
    const p = await createDraft()
    const draft = p.toObject()
    router.push({
      pathname: `/editor/${draft.documentId}`,
    })
  }

  return (
    <>
      <Seo title="Drafts" />
      {status === 'success' && resolvedData.toObject().draftsList.length === 0 && (
        <>
          <div className="bg-background-muted border-muted border-solid border-2 rounded px-8 pt-6 pb-8 mb-4 text-center flex flex-col items-center">
            <h2 className="text-3xl font-semibold text-primary">
              Welcome to Mintter!
            </h2>
            {/* <p className="text-body font-light mt-5">
                Some clain sentence that's fun, welcomes user to the community
                and tells how it works and encourages to get started
              </p> */}
            <button
              onClick={handleCreateDraft}
              className="bg-info hover:bg-info-hover text-white font-bold py-3 px-4 rounded rounded-full flex items-center mt-5 justify-center"
            >
              <NoteAddOutlinedIcon />
              <span className="ml-2">Create your first Draft</span>
            </button>
          </div>
          <hr className="border-t-2 border-muted border-solid my-8" />
        </>
      )}

      <DocumentList
        status={status}
        error={error}
        data={resolvedData?.toObject().draftsList}
      />
    </>
  )
}
