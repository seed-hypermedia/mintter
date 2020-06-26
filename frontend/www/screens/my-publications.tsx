import Seo from 'components/seo'
import NoteAddOutlinedIcon from '@material-ui/icons/NoteAddOutlined'
import DocumentList from 'components/documentList'
import {useMintter} from 'shared/mintterContext'
import {useProfile} from 'shared/profileContext'
import {useMemo} from 'react'
import {useHistory} from 'react-router-dom'

export function MyPublications() {
  const history = useHistory()
  const {createDraft, allPublications} = useMintter()
  const {status, error, resolvedData} = allPublications()
  const {profile} = useProfile()

  async function handleCreateDraft() {
    const n = await createDraft()
    const newDraft = n.toObject()

    history.push({
      pathname: `/editor/${newDraft.documentId}`,
    })
  }

  const myPubs = useMemo(
    () =>
      resolvedData
        ?.toObject()
        .publicationsList.filter(
          p => p.author === profile.toObject().accountId,
        ),
    [resolvedData],
  )

  return (
    <>
      <Seo title="My Publications" />
      {status === 'success' && myPubs.length === 0 && (
        <>
          <hr className="border-t-2 border-muted border-solid my-8" />
          <div className="bg-background-muted border-muted border-solid border-2 rounded px-8 pt-6 pb-8 mb-4 text-center flex flex-col items-center">
            <h3 className="text-xl font-semibold text-primary">
              No Publications (yet)
            </h3>
            <button
              onClick={handleCreateDraft}
              className="bg-info hover:bg-info-hover text-white font-bold py-3 px-4 rounded rounded-full flex items-center mt-5 justify-center"
            >
              <NoteAddOutlinedIcon />
              <span className="ml-2">Create your first Draft</span>
            </button>
          </div>
        </>
      )}
      <DocumentList status={status} error={error} data={myPubs} />
    </>
  )
}
