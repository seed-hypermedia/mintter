import * as React from 'react'
import Seo from 'components/seo'
import DocumentList from 'components/document-list'
import {useDrafts, useMintter} from 'shared/mintter-context'
import {getPath} from 'components/routes'
import {Icons} from 'components/icons'
import {useRouter} from 'shared/use-router'
import {Button} from 'components/button'

export default function Drafts() {
  const {history, match} = useRouter()
  const {createDraft, deleteDocument} = useMintter()
  const {isLoading, isError, isSuccess, error, data} = useDrafts()

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

  return (
    <>
      <Seo title="Drafts" />
      {isSuccess && data.length === 0 && (
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
            <Button
              onClick={onCreateDocument}
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
