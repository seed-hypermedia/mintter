import {useHistory} from 'react-router-dom'
import NoteAddOutlinedIcon from '@material-ui/icons/NoteAddOutlined'
import DocumentList from 'components/documentList'
import {MainLayout} from 'components/main-layout'
import {useMintter} from 'shared/mintterContext'

export function Publications() {
  const {allPublications} = useMintter()
  const history = useHistory()
  const {createDraft} = useMintter()

  const {status, error, resolvedData} = allPublications()

  async function handleCreateDraft() {
    const newDraft = await createDraft().toObject()
    history.push({
      pathname: `/editor/${newDraft.documentId}`,
    })
  }

  return (
    <>
      {status === 'success' &&
        resolvedData.toObject().publicationsList.length === 0 && (
          <>
            <div className="bg-background-muted border-muted border-solid border-2 rounded px-8 pt-6 pb-8 mb-4 text-center flex flex-col items-center">
              <h2 className="text-3xl font-semibold text-primary">
                No Publications (yet)
              </h2>
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
        data={resolvedData?.toObject().publicationsList}
      />
    </>
  )
}
