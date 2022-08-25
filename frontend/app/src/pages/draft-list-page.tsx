import {useDraftList, useMain} from '@app/main-context'
import {pageListStyle} from '@app/pages/list-page'
import {MainWindow} from '@app/pages/window-components'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {LibraryItem} from '@components/library/library-item'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'

export function DraftList({
  createNewDraft,
  createDraftInNewWindow,
}: {
  createNewDraft?: () => void
  createDraftInNewWindow?: () => void
}) {
  const mainService = useMain()
  const [state] = useActor(mainService)
  console.log('state', state.value)
  let drafts = useDraftList()

  createDraftInNewWindow ||= () => mainService.send('COMMIT.OPEN.WINDOW')
  createNewDraft ||= () => mainService.send('CREATE.NEW.DRAFT')

  return (
    <MainWindow>
      <Box
        css={{
          padding: '$5',
          paddingBottom: 0,
          marginBottom: 200,
          marginLeft: 30,
          marginTop: 12,
        }}
      >
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text size="4" fontWeight="bold" data-testid="draft-list-page-title">
            Drafts
          </Text>
          <Button
            size="1"
            variant="ghost"
            color="muted"
            onClick={createDraftInNewWindow}
            data-testid="create-draft-button-in-window"
          >
            New Document
          </Button>
        </Box>
        <Box
          as="ol"
          className={pageListStyle()}
          css={{
            marginLeft: '-$5',
          }}
        >
          {drafts.length ? (
            drafts.map((draft) => (
              <LibraryItem isNew={false} key={draft.id} fileRef={draft.ref} />
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
              data-testid="empty-list-box"
            >
              <Text>No Publications yet.</Text>
              <Button
                data-testid="create-draft-button"
                onClick={createNewDraft}
                size="1"
                variant="outlined"
              >
                Create a new Document
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </MainWindow>
  )
}
