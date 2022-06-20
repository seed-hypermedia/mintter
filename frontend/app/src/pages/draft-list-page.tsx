import {mainService as defaultMainService} from '@app/app-providers'
import {pageListStyle} from '@app/pages/list-page'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {LibraryItem} from '@components/library/library-item'
import {headerButtonsStyles, headerStyles} from '@components/page-header'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'

type DraftListProps = {
  mainService?: typeof defaultMainService
}

export function DraftList({mainService = defaultMainService}: DraftListProps) {
  let [mainState] = useActor(mainService)
  let drafts = mainState.context.draftList

  return (
    <>
      <Box
        css={{
          padding: '$5',
          paddingBottom: 0,
          marginBottom: 200,
          marginLeft: 30,
          marginTop: 12,
        }}
      >
        <Text size="4" fontWeight="bold">
          Drafts
        </Text>
        <ol className={pageListStyle()}>
          {drafts.length ? (
            drafts.map((draft) => (
              <LibraryItem
                key={draft.id}
                fileRef={draft.ref}
                mainService={mainService}
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
              <Button
                onClick={() => mainService.send('CREATE.NEW.DRAFT')}
                size="1"
                variant="outlined"
              >
                Create a new Document
              </Button>
            </Box>
          )}
        </ol>
      </Box>
      <Box className={headerStyles()}>
        <Box className={headerButtonsStyles()}>
          <Button
            onClick={() => mainService.send('COMMIT.OPEN.WINDOW')}
            size="1"
            color="primary"
          >
            New Document
          </Button>
        </Box>
      </Box>
    </>
  )
}
