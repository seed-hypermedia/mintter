import {useFiles} from '@app/main-page-context'
import {pageListStyle} from '@app/pages/list-page'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {LibraryItem} from '@components/library/library-item'
import {useCreateDraft} from '@components/library/use-create-draft'
import {footerButtonsStyles, footerStyles} from '@components/page-footer'
import {Text} from '@components/text'
import {invoke} from '@tauri-apps/api'

export function PublicationList() {
  let files = useFiles()
  let {createDraft} = useCreateDraft()

  async function onOpenInNewWindow() {
    await invoke('plugin:window|open_in_new_window', {url: `/new`})
  }

  return (
    <>
      <Box css={{padding: '$5', paddingBottom: 0, marginBottom: 200}}>
        <Text size="8">Publications</Text>
        <ol className={pageListStyle()}>
          {files.length ? (
            files.map((publication) => (
              <LibraryItem
                key={publication.version}
                publication={publication}
                href={`/p/${publication.document?.id}/${publication.version}`}
              />
            ))
          ) : (
            <Box
              css={{
                width: '$full',
                maxWidth: '$prose-width',
                display: 'flex',
                flexDirection: 'column',
                gap: '$4',
                padding: '$6',
                margin: '$4',
                marginLeft: '-$6',
              }}
            >
              <Text>No Publications yet.</Text>
              <Button onClick={() => createDraft()} size="1" variant="outlined">
                Create a new Document
              </Button>
            </Box>
          )}
        </ol>
      </Box>
      <Box className={footerStyles()}>
        <Box className={footerButtonsStyles()}>
          <Button onClick={onOpenInNewWindow} size="1" color="primary">
            New Document
          </Button>
        </Box>
      </Box>
    </>
  )
}
