import {mainService as defaultMainService} from '@app/app-providers'
import {Document} from '@app/client'
import {DraftRef, PublicationRef} from '@app/main-page-machine'
import {createPublicationMachine} from '@app/publication-machine'
import {css} from '@app/stitches.config'
import {StyledItem} from '@components/library/library-item'
import {Section} from '@components/library/section'
import {useActor} from '@xstate/react'
import {createMachine, StateFrom} from 'xstate'

export function RecentsSection({
  mainService = defaultMainService,
}: {
  mainService?: typeof defaultMainService
}) {
  let [mainState] = useActor(mainService)
  let {recents} = mainState.context

  return (
    <Section title="Recents" icon="Clock">
      {recents.length
        ? recents.map((fileRef) => (
            <RecentItem
              key={fileRef.id}
              fileRef={fileRef}
              mainService={mainService}
            />
          ))
        : null}
    </Section>
  )
}

var listItemStyle = css({
  '& a': {
    display: 'block',
    width: '$full',
    textDecoration: 'none',
    color: 'inherit',
    fontFamily: '$base',
    fontSize: '$2',
  },
  '&:hover': {
    cursor: 'pointer',
    backgroundColor: '$base-component-bg-hover',
  },
})

type RecentItemProps = {
  fileRef: PublicationRef | DraftRef
  mainService?: typeof defaultMainService
}

function RecentItem({
  fileRef,
  mainService = defaultMainService,
}: RecentItemProps) {
  let [state] = useActor(fileRef)

  function goToDocument(e) {
    e.preventDefault()
    if (fileRef.id.startsWith('doc-')) {
      mainService.send({
        type: 'GO.TO.DRAFT',
        docId: state.context.documentId,
      })
    } else {
      // TODO: here we might be missing the blockId from the URL, not sure where do we need to store this or if we need to.
      mainService.send({
        type: 'GO.TO.PUBLICATION',
        docId: state.context.documentId,
        version: (
          state as StateFrom<ReturnType<typeof createPublicationMachine>>
        ).context.version,
      })
    }
  }

  return (
    <StyledItem className={listItemStyle()}>
      <a className="title" onClick={goToDocument} href="">
        {state.context.title || 'Untitled Document'}
      </a>
    </StyledItem>
  )
}

type RecentItemContext = {
  document?: Document
  errorMessage: string
}

type RecentItemEvent =
  | {
      type: 'REPORT.PUBLICATION.SUCCESS'
      document: Document
    }
  | {
      type: 'REPORT.PUBLICATION.ERROR'
      errorMessage: string
    }
  | {type: 'RETRY'}

var recentItemMachine = createMachine({
  initial: 'fetching',
  tsTypes: {} as import('./section-recents.typegen').Typegen0,
  schema: {
    context: {} as RecentItemContext,
    events: {} as RecentItemEvent,
  },
  context: {
    document: undefined,
    errorMessage: '',
  },
  states: {
    fetching: {
      tags: ['loading'],
      invoke: {
        id: 'fetchDocument',
        src: 'fetchDocument',
      },
      on: {
        'REPORT.PUBLICATION.SUCCESS': {
          target: 'ready',
          actions: ['assignDocument'],
        },
        'REPORT.PUBLICATION.ERROR': {
          target: 'error',
          actions: ['assignError'],
        },
      },
    },
    ready: {},
    error: {
      on: {
        RETRY: 'fetching',
      },
    },
  },
})
