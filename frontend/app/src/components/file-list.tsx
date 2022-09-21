import {useActivity} from '@app/main-context'
import {DraftWithRef, PublicationWithRef} from '@app/main-machine'
import {pageListStyle} from '@app/pages/list-page'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {LibraryItem} from '@components/library/library-item'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'

type FileListProps = {
  items: Array<PublicationWithRef | DraftWithRef>
  handleNewDraft: () => void
  handleNewWindow: () => void
  emptyLabel: string
  title?: string
}

export function FileList({
  items,
  handleNewDraft,
  handleNewWindow,
  emptyLabel,
  title,
}: FileListProps) {
  let activity = useActivity()
  let [state] = useActor(activity)

  return (
    <Box
      css={{
        padding: '$5',
        paddingBottom: 0,
        marginBottom: 200,
        marginLeft: 30,
        marginTop: 12,
      }}
    >
      {title && (
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text data-testid="filelist-title" size="4" fontWeight="bold">
            {title}
          </Text>
          <Button
            data-testid="filelist-new-window-button"
            size="1"
            variant="ghost"
            color="muted"
            onClick={handleNewWindow}
          >
            New Document
          </Button>
        </Box>
      )}
      <Box as="ol" className={pageListStyle()} data-testid="filelist-list">
        {items.length ? (
          items.map((file) => (
            <LibraryItem
              isNew={
                state.matches('ready') && (file as PublicationWithRef).document
                  ? !state.context.visitList.includes(
                      `${(file as PublicationWithRef).document?.id}/${
                        (file as PublicationWithRef).version
                      }`,
                    )
                  : false
              }
              fileRef={file.ref}
              key={
                (file as PublicationWithRef).document
                  ? `${(file as PublicationWithRef).document?.id}-${
                      (file as PublicationWithRef).version
                    }`
                  : (file as DraftWithRef).id
              }
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
            <Text data-testid="filelist-empty-label">{emptyLabel}</Text>
            <Button
              data-testid="filelist-new-button"
              onClick={handleNewDraft}
              size="1"
              variant="outlined"
            >
              Create a new Document
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
