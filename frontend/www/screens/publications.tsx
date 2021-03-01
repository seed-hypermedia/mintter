import {Icons} from 'components/icons'
import DocumentList from 'components/document-list'
import {useMintter, useOthersPublications} from 'shared/mintter-context'
import Seo from 'components/seo'
import {ErrorMessage} from 'components/error-message'
import {useRouter} from 'shared/use-router'
import {getPath} from 'components/routes'
import {Button} from 'components/button'

export default function Publications() {
  const {history, match} = useRouter()
  const {createDraft, deleteDocument} = useMintter()

  const {isLoading, isError, error, data} = useOthersPublications()

  async function handleCreateDraft() {
    const n = await createDraft()
    const newDraft = n.toObject()

    history.push({
      pathname: `${getPath(match)}/editor/${newDraft.version}`,
    })
  }

  async function handleDeleteDocument(version: string) {
    await deleteDocument(version)
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
            <Button
              onClick={handleCreateDraft}
              appearance="pill"
              variant="primary"
              css={{
                height: '$7',
                fontSize: '$3',
                marginTop: '$4',
                display: 'inline-flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '$2',
                px: '$4',
              }}
            >
              <Icons.FilePlus color="currentColor" />
              <span className="ml-2">Start your first document</span>
            </Button>
          </div>
        </>
      )}
      <DocumentList
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data}
        onDeleteDocument={handleDeleteDocument}
      />
    </>
  )
}
