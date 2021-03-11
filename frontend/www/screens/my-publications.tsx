import Seo from 'components/seo'
import DocumentList from 'components/document-list'
import {useMintter, useMyPublications} from 'shared/mintter-context'
import {ErrorMessage} from 'components/error-message'
import {Icons} from 'components/icons'
import {getPath} from 'components/routes'
import {useRouter} from 'shared/use-router'
import {Button} from 'components/button'
import {Separator} from 'components/separator'
import {Box} from 'components/box'

export default function MyPublications({noSeo = false, isPublic = false}) {
  const {history, match} = useRouter()
  const {createDraft, deleteDocument} = useMintter()
  const {isError, isLoading, isSuccess, error, data} = useMyPublications()

  async function onCreateDocument() {
    const d = await createDraft()
    const value = d.toObject()
    history.push({
      pathname: `${getPath(match)}/editor/${value.version}`,
    })
  }

  async function handleDeleteDocument(version: string) {
    await deleteDocument(version)
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
          <Separator />
          <Box
            css={{
              bc: '$gray200',
              p: '$6',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: '$3',
              boxShadow:
                'inset 0 0 0 1px $colors$gray400, 0 0 0 1px $colors$gray400',
            }}
          >
            <h3 className="text-xl font-semibold text-primary">
              No Publications (yet)
            </h3>
            {!isPublic && (
              <Button
                onClick={() => onCreateDocument()}
                appearance="pill"
                variant="primary"
                css={{
                  height: '$7',
                  fontSize: '$3',
                  marginTop: '$4',
                  px: '$4',
                }}
              >
                <Icons.FilePlus color="currentColor" />
                <span>Start your first document</span>
              </Button>
            )}
          </Box>
        </>
      )}
      <DocumentList
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data}
        onDeleteDocument={!isPublic && handleDeleteDocument}
      />
    </>
  )
}
