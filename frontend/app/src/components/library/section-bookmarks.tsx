import {Document, getDraft, getPublication} from '@app/client'
import {queryKeys} from '@app/hooks'
import {useMainPage} from '@app/main-page-context'
import {css} from '@app/stitches.config'
import {useBookmarksService} from '@components/bookmarks'
import {BookmarkItem} from '@components/library/bookmark-item'
import {EmptyList, Section} from '@components/library/section'
import {SectionError} from '@components/library/section-error'
import {useActor, useMachine} from '@xstate/react'
import {ErrorBoundary} from 'react-error-boundary'
import {useQueryClient} from 'react-query'
import {assign, createMachine} from 'xstate'

var listStyle = css({
  margin: 0,
  padding: 0,
  paddingLeft: '$7',
})

export function BookmarksSection() {
  const service = useBookmarksService()
  const [state, send] = useActor(service)

  function onReset() {
    send('BOOKMARK.RESET')
  }

  return (
    <Section title="Bookmarks" icon="Star">
      {state.context.bookmarks.length ? (
        <ErrorBoundary FallbackComponent={SectionError} onReset={onReset}>
          {state.context.bookmarks.map((bookmark) => (
            <BookmarkItem key={bookmark.url} itemRef={bookmark.ref} />
          ))}
        </ErrorBoundary>
      ) : (
        <EmptyList />
      )}
    </Section>
  )
}

var listItemStyle = css({
  padding: '$2',
  display: 'block',
  listStyleType: 'none',
  color: '$base-text-high',
  fontFamily: '$base',
  fontSize: '$2',
  '& a': {
    display: 'block',
    width: '$full',
    textDecoration: 'none',
    color: 'inherit',
  },
  '&:hover': {
    cursor: 'pointer',
    color: '$primary-text-low',
    backgroundColor: '$base-component-bg-hover',
  },
})

function RecentItem({item}: {item: string}) {
  let client = useQueryClient()
  let mainService = useMainPage()
  const [, type, docId, version, blockId] = item.split('/')
  let [state] = useMachine(
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
    return <li className={listItemStyle()}>...</li>
  }

  if (state.matches('error')) {
    console.log('RECENT ITEM ERROR', state.context.errorMessage)

    return <li className={listItemStyle()}>ERROR</li>
  }

  return (
    <li className={listItemStyle()}>
      <a onClick={goToDocument} href="">
        {state.context.document?.title}
      </a>
    </li>
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
  tsTypes: {} as import('./section-bookmarks.typegen').Typegen0,
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
