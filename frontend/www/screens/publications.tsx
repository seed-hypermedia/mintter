import {Icons} from '@mintter/editor'
import DocumentList from 'components/document-list'
import {useMintter, useOthersPublications} from 'shared/mintterContext'
import Seo from 'components/seo'
import {ErrorMessage} from 'components/errorMessage'
import {useRouter} from 'shared/use-router'
import {getPath} from 'components/routes'

export default function Publications() {
  const {history, match} = useRouter()
  const {createDraft} = useMintter()

  const {isLoading, isError, error, data} = useOthersPublications()

  async function handleCreateDraft() {
    const n = await createDraft()
    const newDraft = n.toObject()

    history.push({
      pathname: `${getPath(match)}/editor/${newDraft.version}`,
    })
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

  if (isLoading) {
    return <p className="text-body text-sm mt-2">loading...</p>
  }

  return (
    <>
      <Seo title="Feed" />
      {data.length === 0 && (
        <>
          <hr className="border-t-2 border-muted border-solid my-8" />
          <div className="bg-background-muted border-muted border-solid border-2 rounded px-8 pt-6 pb-8 mb-4 text-center flex flex-col items-center">
            <h3 className="text-xl font-semibold text-primary">
              No Publications (yet)
            </h3>
            <button
              onClick={handleCreateDraft}
              className="bg-primary hover:shadow-lg text-white font-bold py-3 px-4 rounded-full flex items-center mt-5 justify-center"
            >
              <Icons.FilePlus color="currentColor" />
              <span className="ml-2">Start your first document</span>
            </button>
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
