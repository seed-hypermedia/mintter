import Seo from 'components/seo'
import DocumentList from 'components/documentList'
import {useMintter, useMyPublications} from 'shared/mintterContext'
import {useHistory} from 'react-router-dom'
import {ErrorMessage} from 'components/errorMessage'
import {Icons} from '@mintter/editor'

export default function MyPublications({noSeo = false, isPublic = false}) {
  const history = useHistory()
  const {createDraft} = useMintter()
  const {isError, isLoading, isSuccess, error, data} = useMyPublications()

  async function handleCreateDraft() {
    const n = await createDraft()
    const newDraft = n.toObject()

    history.push({
      pathname: `/private/editor/${newDraft.version}`,
    })
  }

  if (isLoading) {
    return <p className="text-body text-sm mt-2">loading...</p>
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

  return (
    <>
      {!noSeo && <Seo title="My Publications" />}
      {isSuccess && data.length === 0 && (
        <>
          <hr className="border-t-2 border-muted border-solid my-8" />
          <div className="bg-background-muted border-muted border-solid border-2 rounded px-8 py-6 mb-4 text-center flex flex-col items-center">
            <h3 className="text-xl font-semibold text-primary">
              No Publications (yet)
            </h3>
            {!isPublic && (
              <button
                onClick={handleCreateDraft}
                className="bg-primary hover:shadow-lg text-white font-bold py-3 px-4 rounded-full flex items-center mt-5 justify-center"
              >
                <Icons.FilePlus color="currentColor" />
                <span className="ml-2">Start your first document</span>
              </button>
            )}
          </div>
        </>
      )}
      <DocumentList
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data}
      />
    </>
  )
}
