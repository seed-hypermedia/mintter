import {Document, getDraft, getPublication} from '@app/client'
import {queryKeys} from '@app/hooks'
import {useMainPage, useRecents} from '@app/main-page-context'
import {css} from '@app/stitches.config'
import {StyledItem} from '@components/library/library-item'
import {Section} from '@components/library/section'
import {useMachine} from '@xstate/react'
import {useQueryClient} from 'react-query'
import {assign, createMachine} from 'xstate'

export function RecentsSection() {
  let recents = useRecents()

  return (
    <Section title="Recents" icon="Clock">
      {recents.length
        ? recents.map((item) => <RecentItem key={item} item={item} />)
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

function RecentItem({item}: {item: string}) {
  let client = useQueryClient()
  let mainService = useMainPage()
  const [, type, docId, version, blockId] = item.split('/')
  let [state] = useMachine(() =>
    recentItemMachine.withConfig({
      services: {
        fetchDocument: () => (sendBack) => {
          try {
            if (type == 'editor') {
              client
                .fetchQuery([queryKeys.GET_DRAFT, docId], ({queryKey}) => {
                  let [, docId] = queryKey
                  return getDraft(docId)
                })
                .then((draft) => {
                  sendBack({
                    type: 'REPORT.PUBLICATION.SUCCESS',
                    document: draft,
                  })
                })
            } else {
              client
                .fetchQuery(
                  [queryKeys.GET_PUBLICATION, docId, version],
                  ({queryKey}) => {
                    let [, docId, version] = queryKey
                    return getPublication(docId, version)
                  },
                )
                .then((publication) => {
                  if (publication.document) {
                    sendBack({
                      type: 'REPORT.PUBLICATION.SUCCESS',
                      document: publication.document,
                    })
                  } else {
                    sendBack({
                      type: 'REPORT.PUBLICATION.ERROR',
                      errorMessage: `Document is not defined in Publication ${docId} with version ${version}`,
                    })
                  }
                })
            }
          } catch (err) {
            sendBack({
              type: 'REPORT.PUBLICATION.ERROR',
              errorMessage: `inside catch of fetchDocument: ${JSON.stringify(
                err,
              )}`,
            })
          }
        },
      },
      actions: {
        assignDocument: assign({
          document: (_, event) => event.document,
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
      },
    }),
  )

  function goToDocument(e) {
    e.preventDefault()
    if (type == 'editor') {
      mainService.send({
        type: 'goToEditor',
        docId,
      })
    } else {
      mainService.send({
        type: 'goToPublication',
        docId,
        version,
        blockId,
      })
    }
  }

  if (state.matches('fetching')) {
    return <StyledItem>...</StyledItem>
  }

  if (state.matches('error')) {
    console.log('RECENT ITEM ERROR', state.context.errorMessage)

    return <StyledItem>ERROR</StyledItem>
  }

  return (
    <StyledItem className={listItemStyle()}>
      <a className="title" onClick={goToDocument} href="">
        {state.context.document?.title || 'Untitled Document'}
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
