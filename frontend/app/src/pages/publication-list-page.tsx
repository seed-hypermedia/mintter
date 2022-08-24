import {activityMachine} from '@app/activity-machine'
import {useActivity, useMain, usePublicationList} from '@app/main-context'
import {pageListStyle} from '@app/pages/list-page'
import {MainWindow} from '@app/pages/window-components'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {LibraryItem} from '@components/library/library-item'
import {Text} from '@components/text'
import {useSelector} from '@xstate/react'
import {ActorRefFrom} from 'xstate'

export function PublicationList() {
  const mainService = useMain()
  let activityService = useActivity()
  let visitList = useSelector(
    activityService as ActorRefFrom<typeof activityMachine>,
    (state) => state.context.visitList,
  )

  let pubList = usePublicationList()
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
          <Text size="4" fontWeight="bold">
            Publications
          </Text>
          <Button
            size="1"
            variant="ghost"
            color="muted"
            onClick={() => mainService.send('COMMIT.OPEN.WINDOW')}
          >
            New Document
          </Button>
        </Box>
        <Box as="ol" className={pageListStyle()}>
          {pubList.length ? (
            pubList.map((publication) => (
              <LibraryItem
                isNew={
                  !visitList.includes(
                    `${publication.document?.id}/${publication.version}`,
                  )
                }
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
                onClick={() => mainService.send('CREATE.NEW.DRAFT')}
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
