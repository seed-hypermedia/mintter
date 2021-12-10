import {Publication as PublicationType} from '@mintter/client'
import {getPublication} from '@mintter/client/publications'
import {Document, MttastContent} from '@mintter/mttast'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {css, styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
// import {getCurrent as getCurrentWindow} from '@tauri-apps/api/window'
import {useActor, useMachine} from '@xstate/react'
import {useEffect, useRef} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {useLocation} from 'wouter'
import {createModel} from 'xstate/lib/model'
import {AppError} from '../app'
import {Avatar} from '../components/avatar'
import {useEnableSidepanel, useIsSidepanelOpen, useSidepanel} from '../components/sidepanel'
import {Editor} from '../editor'
import {EditorMode} from '../editor/plugin-utils'
import {useAccount} from '../hooks'
import {getDateFormat} from '../utils/get-format-date'

const Heading = styled('h1', {
  fontSize: '$5',
  width: '$full',
  maxWidth: 445,
  margin: 0,
  padding: 0,
})

const headerFooterStyle = css({
  gridArea: 'footer',
  $$gap: '$space$5',
  display: 'flex',
  gap: '$$gap',
  alignItems: 'center',
  '& span': {
    position: 'relative',
  },
  '& span:not(:first-child):before': {
    content: `"|"`,
    color: '$text-muted',
    position: 'absolute',
    left: -8,
    top: 0,
  },
})

type PublicationPageProps = {
  params?: {docId: string}
}

export default function Publication({params}: PublicationPageProps) {
  const [, setLocation] = useLocation()
  const sidepanelService = useSidepanel()
  const [, sidepanelSend] = useActor(sidepanelService)
  // const {status, data, error} = usePublication(params!.docId)
  const [state, send] = usePagePublication(params?.docId)
  console.log('🚀 ~ file: publication.tsx ~ line 58 ~ Publication ~ state', state)

  useEnableSidepanel()

  useEffect(() => {
    if (params?.docId) {
      send(publicationModel.events.FETCH_DATA(params?.docId))
    }
  }, [params?.docId])

  // useEffect(() => {
  //   if (data.document.title) {
  //     getCurrentWindow().setTitle(data.document.title)
  //   }
  // }, [data.document.title])

  useEffect(() => {
    if (state.matches('ready')) {
      sidepanelSend({type: 'SIDEPANEL_LOAD_ANNOTATIONS', document: state.context.publication?.document})
    }
  }, [state.value])

  if (state.matches('fetching')) {
    return <Text>loading...</Text>
  }

  // start rendering
  if (state.matches('errored')) {
    return <Text>Publication ERROR</Text>
  }

  if (state.matches('ready')) {
    return (
      <ErrorBoundary
        FallbackComponent={AppError}
        onReset={() => {
          window.location.reload()
        }}
      >
        <Box
          data-testid="publication-wrapper"
          css={{
            // gridArea: 'maincontent',
            width: '$full',
            padding: '$5',
            paddingTop: '$8',
            marginHorizontal: '$4',
            paddingBottom: 300,
            height: '100%',
            '@bp2': {
              paddingTop: '$9',
              marginHorizontal: '$9',
            },
          }}
        >
          <PublicationHeader document={state.context.publication?.document} />
          <Box css={{marginTop: 50, width: '$full', maxWidth: '64ch'}}>
            <Editor
              mode={EditorMode.Publication}
              value={state.context.publication?.document.content as Array<MttastContent>}
            />
          </Box>
        </Box>
      </ErrorBoundary>
    )
  }

  return null
}

export function PublicationHeader({document}: {document?: Document & {content: Array<MttastContent>}}) {
  const {data: author} = useAccount(document?.author, {
    enabled: !!document?.author,
  })
  const isOpen = useIsSidepanelOpen()

  return document ? (
    <Box
      css={{
        marginTop: '$5',
        display: 'grid',
        gridTemplateColumns: '1fr',
        gridTemplateRows: '32px min-content min-content min-content',
        gridTemplateAreas: `"author"
        "title"
        "footer"
        "citation-toolbar"`,
        gap: '$5',

        '@bp2': {
          gridTemplateColumns: isOpen ? '1fr' : '440px auto',
          gridTemplateRows: isOpen ? '32px min-content min-content min-content' : '32px min-content min-content',
          gridTemplateAreas: isOpen
            ? `"author"
          "title"
          "footer"
          "citation-toolbar"`
            : `"author author"
        "title citation-toolbar"
        "footer footer"`,
        },
      }}
    >
      {author && (
        <Box css={{gridArea: 'author', display: 'flex', gap: '$3', alignItems: 'center'}}>
          <Avatar size="3" />
          <Text size="3" fontWeight="medium">
            {author.profile?.alias}
          </Text>
        </Box>
      )}
      <Heading css={{gridArea: 'title'}}>{document.title}</Heading>
      {/* {document.subtitle && (
          <Text color="muted" size="4">
            {document.subtitle}
          </Text>
        )} */}
      <Box className={headerFooterStyle()}>
        <Text size="1" color="muted">
          {getDateFormat(document, 'publishTime')}
        </Text>
        <Text size="1" color="muted">
          Version 3
        </Text>
        <Text size="1" color="primary" css={{textDecoration: 'underline'}}>
          View Versions
        </Text>
        <Text color="muted" size="1">
          Tipped $0.09
        </Text>
      </Box>
      <Box
        css={{
          gridArea: 'citation-toolbar',
          marginLeft: '-$3',
          '@bp2': {
            marginLeft: isOpen ? '-$5' : 0,
            marginTop: '-$3',
          },
        }}
      >
        <Box css={{display: 'flex', alignItems: 'center', gap: '$3'}}>
          <Button size={{'@initial': '1', '@bp2': '2'}} variant="ghost" color="primary">
            View Discussion (13)
          </Button>
          <Text color="muted">|</Text>
          <Button size={{'@initial': '1', '@bp2': '2'}} variant="ghost" color="primary">
            Cite
          </Button>
          <Text color="muted">|</Text>
          <Button size={{'@initial': '1', '@bp2': '2'}} variant="ghost" color="success">
            Tip Author
          </Button>
        </Box>
      </Box>
    </Box>
  ) : null
}

function usePagePublication(docId?: string) {
  // const client = useQueryClient()
  const machine = useRef(publicationMachine)
  const [state, send] = useMachine(machine.current)

  useEffect(() => {
    if (docId) {
      send(publicationModel.events.FETCH_DATA(docId))
    }
  }, [send, docId])

  return [state, send] as const
}

// export function useEditorDraft({documentId, ...afterActions}: UseEditorDraftParams) {
//   const client = useQueryClient()
//   const machine = useRef(draftEditorMachine({...afterActions, client}))

//   const [state, send] = useMachine(machine.current, {devTools: true})

//   useEffect(() => {
//     if (documentId) {
//       send({type: 'FETCH', documentId})
//     }
//   }, [send, documentId])
//   return [state, send] as const
// }

type ClientPublication = PublicationType & {
  document: {
    content: Array<MttastContent>
  }
}
const publicationModel = createModel(
  {
    id: '',
    publication: null as ClientPublication | null,
    errorMessage: '',
  },
  {
    events: {
      REPORT_DATA_REVEIVED: (publication: ClientPublication) => ({publication}),
      REPORT_DATA_ERRORED: (errorMessage: string) => ({errorMessage}),
      FETCH_DATA: (id: string) => ({id}),
    },
  },
)

const publicationMachine = publicationModel.createMachine({
  id: 'publication-machine',
  context: publicationModel.initialContext,
  initial: 'idle',
  states: {
    idle: {
      on: {
        FETCH_DATA: {
          target: 'fetching',
          actions: [
            publicationModel.assign({
              id: (_, event) => event.id,
            }),
          ],
        },
      },
    },
    fetching: {
      invoke: {
        src: (ctx) => (sendBack) => {
          console.log('invoke fetching!', ctx)

          getPublication(ctx.id)
            .then((response) => {
              if (response.document?.content) {
                let content = JSON.parse(response.document?.content)
                sendBack(
                  publicationModel.events.REPORT_DATA_REVEIVED(
                    Object.assign(response, {document: {...response.document, content}}),
                  ),
                )
              } else {
                console.log('error parsing content', response)

                sendBack(publicationModel.events.REPORT_DATA_ERRORED('error parsing content'))
              }
            })
            .catch((err) => {
              console.log('publication fetch error', err)
              sendBack(publicationModel.events.REPORT_DATA_ERRORED('error fetching'))
            })
        },
      },
      on: {
        REPORT_DATA_REVEIVED: {
          target: 'ready',
          actions: publicationModel.assign({
            publication: (_, ev) => ev.publication,
          }),
        },
        REPORT_DATA_ERRORED: {
          target: 'errored',
          actions: publicationModel.assign({
            errorMessage: (_, ev) => ev.errorMessage,
          }),
        },
      },
    },
    ready: {
      on: {
        FETCH_DATA: {
          target: 'fetching',
          actions: [
            publicationModel.assign({
              id: (_, event) => event.id,
            }),
          ],
        },
      },
    },
    errored: {
      on: {
        FETCH_DATA: {
          target: 'fetching',
          actions: [
            publicationModel.assign({
              id: (_, event) => event.id,
            }),
          ],
        },
      },
    },
  },
})
