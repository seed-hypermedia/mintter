import * as React from 'react'
import Seo from 'components/seo'
import DocumentList from 'components/document-list'
import {useDraftsList, useMintter} from 'shared/mintter-context'
import {getPath} from 'components/routes'
import {Icons} from 'components/icons'
import {useRouter} from 'shared/use-router'
import {Button} from 'components/button'
import {Separator} from 'components/separator'
import {Text} from 'components/text'
import {Box} from 'components/box'

export default function Drafts() {
  const {history, match} = useRouter()
  const {createDraft, deleteDocument} = useMintter()
  const {isLoading, isError, isSuccess, error, data} = useDraftsList()

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
          <Separator />
          <Box
            css={{
              backgroundColor: '$gray200',
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
              <Text size="3" color="white">
                Start your first document
              </Text>
            </Button>
          </Box>
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
