import {useDraftList} from '@app/files-context'
import {useMainPage} from '@app/main-page-context'
import {pageListStyle} from '@app/pages/list-page'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {LibraryItem} from '@components/library/library-item'
import {footerButtonsStyles, footerStyles} from '@components/page-footer'
import {Text} from '@components/text'

export function DraftList() {
  let drafts = useDraftList()
  let mainService = useMainPage()

  return (
    <>
      <Box
        css={{
          padding: '$5',
          paddingBottom: 0,
          marginBottom: 200,
        }}
      >
        <Text size="8">Drafts</Text>
        <ol className={pageListStyle()}>
          {drafts.length ? (
            drafts.map((draft) => (
              <LibraryItem
                key={draft.id}
                draft={draft}
                href={`/editor/${draft.id}`}
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
                onClick={() => mainService.send('CREATE_NEW_DRAFT')}
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
            onClick={() => mainService.send('OPEN_WINDOW')}
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
