import {mainService as defaultMainService} from '@app/app-providers'
import {pageListStyle} from '@app/pages/list-page'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {LibraryItem} from '@components/library/library-item'
import {footerButtonsStyles, footerStyles} from '@components/page-footer'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'

type PublicationListProps = {
  mainService?: typeof defaultMainService
}

export function PublicationList({
  mainService = defaultMainService,
}: PublicationListProps) {
  let [mainState] = useActor(mainService)
  let pubList = mainState.context.publicationList
  return (
    <>
      <Box css={{padding: '$5', paddingBottom: 0, marginBottom: 200}}>
        <Text size="8">Publications</Text>
        <ol className={pageListStyle()}>
          {pubList.length ? (
            pubList.map((publication) => (
              <LibraryItem
                fileRef={publication.ref}
                key={publication.version}
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
                onClick={() => mainService.send('COMMIT.NEW.DRAFT')}
                size="1"
                variant="outlined"
              >
                Create a new Document
              </Button>
            </Box>
          )}
        </ol>
      </Box>
      <Box className={footerStyles()}>
        <Box className={footerButtonsStyles()}>
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
