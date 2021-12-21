import {createDraft, getInfo, getPublication, Publication as PublicationType} from '@mintter/client'
import {MttastContent} from '@mintter/mttast'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Text} from '@mintter/ui/text'
// import {getCurrent as getCurrentWindow} from '@tauri-apps/api/window'
import {useMachine} from '@xstate/react'
import {useEffect, useRef} from 'react'
import {useLocation} from 'wouter'
import {createModel} from 'xstate/lib/model'
import {useEnableSidepanel, useSidepanel} from '../components/sidepanel'
import {Editor, EditorDocument} from '../editor'
import {EditorMode} from '../editor/plugin-utils'
import {useAccount} from '../hooks'
import {getDateFormat} from '../utils/get-format-date'
import {PageProps} from './types'

export default function Publication({params}: PageProps) {
  const [, setLocation] = useLocation()
  const sidepanelService = useSidepanel()
  // const {status, data, error} = usePublication(params!.docId)
  const [state, send] = usePagePublication(params?.docId)
  const {data: author} = useAccount(state.context.publication?.document?.author, {
    enabled: !!state.context.publication?.document?.author,
  })

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
      sidepanelService.send({type: 'SIDEPANEL_LOAD_ANNOTATIONS', document: state.context.publication?.document})
    }
  }, [state.value])

  async function handleUpdate() {
    try {
      const d = await createDraft(params?.docId)
      if (d?.id) {
        setLocation(`/editor/${d.id}`)
      }
    } catch (err) {
      console.warn(`createDraft Error: "createDraft" does not returned a Document`, err)
    }
  }

  if (state.matches('fetching')) {
    return <Text>loading...</Text>
  }

  // start rendering
  if (state.matches('errored')) {
    return (
      <Box
        css={{
          padding: '$5',
        }}
      >
        <Text>Publication ERROR</Text>
        <Text>{state.context.errorMessage}</Text>
        <Button onClick={() => send(publicationModel.events.FETCH_DATA(state.context.id))} color="muted">
          try again
        </Button>
      </Box>
    )
  }

  if (state.matches('ready')) {
    return (
      <>
        <Box
          css={{
            background: '$background-alt',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            position: 'sticky',
            top: 0,
            zIndex: '$3',
            padding: '$5',
            '@bp2': {
              paddingLeft: 80,
            },
            $$gap: '16px',
            display: 'flex',
            gap: '$$gap',
            alignItems: 'center',
            '& *': {
              position: 'relative',
            },
            '& *:not(:first-child):before': {
              content: `"|"`,
              color: '$text-muted',
              opacity: 0.5,
              position: 'absolute',
              left: '-10px',
              top: '50%',
              transform: 'translateY(-50%)',
            },
          }}
        >
          {author && (
            <>
              <Text size="1" color="muted" css={{paddingRight: '$3'}}>
                <span>Signed by </span>
                <span style={{textDecoration: 'underline'}}>
                  {state.context.canUpdate ? 'you' : author.profile?.alias}
                </span>
              </Text>
            </>
          )}
          {state.context.canUpdate && (
            <Button size="1" variant="ghost" onClick={handleUpdate}>
              Update
            </Button>
          )}
          <Button size="1" variant="ghost">
            View Discussion
          </Button>
          {!state.context.canUpdate && (
            <Button size="1" variant="ghost" color="success">
              Tip Author
            </Button>
          )}
        </Box>
        <Box
          data-testid="publication-wrapper"
          css={{
            padding: '$5',
            paddingTop: '$8',
            marginHorizontal: '$4',
            paddingBottom: 300,
            height: '100%',
            '@bp2': {
              marginHorizontal: '$9',
            },
          }}
        >
          {/* <PublicationHeader document={state.context.publication?.document} /> */}

          <Box css={{width: '$full', maxWidth: '64ch'}}>
            <Editor
              mode={EditorMode.Publication}
              value={state.context.publication?.document.content as Array<MttastContent>}
            />
          </Box>
        </Box>
        <Box
          css={{
            background: '$background-alt',
            width: '$full',
            position: 'absolute',
            bottom: 0,
            zIndex: '$3',
            padding: '$5',

            '@bp2': {
              paddingLeft: 80,
            },
            '&:after': {
              content: '',
              position: 'absolute',
              width: '$full',
              height: 20,
              background: 'linear-gradient(0deg, $colors$background-alt 0%, rgba(255,255,255,0) 100%)',
              top: -20,
              left: 0,
            },
            $$gap: '24px',
            display: 'flex',
            gap: '$$gap',
            alignItems: 'center',
            '& > span': {
              position: 'relative',
            },
            '& > span:before': {
              content: `"|"`,
              color: '$text-muted',
              position: 'absolute',
              right: -15,
              top: 0,
            },
          }}
        >
          <Text size="1" color="muted">
            Created on: {getDateFormat(state.context.publication?.document, 'createTime')}
          </Text>
          <Text size="1" color="muted">
            Last modified: {getDateFormat(state.context.publication?.document, 'updateTime')}
          </Text>
        </Box>
      </>
    )
  }

  return null
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

export type ClientPublication = Omit<PublicationType, 'document'> & {document: EditorDocument}

const publicationModel = createModel(
  {
    id: '',
    publication: null as ClientPublication | null,
    errorMessage: '',
    canUpdate: false,
  },
  {
    events: {
      REPORT_DATA_REVEIVED: (props: {publication: ClientPublication; canUpdate: boolean}) => props,
      REPORT_DATA_ERRORED: (errorMessage: string) => ({errorMessage}),
      FETCH_DATA: (id: string) => ({id}),
    },
  },
)

const publicationMachine = publicationModel.createMachine({
  id: 'publication-machine',
  context: publicationModel.initialContext,
  initial: 'idle',
  entry: () => {},
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
          Promise.all([getPublication(ctx.id), getInfo()])
            .then(([publication, info]) => {
              console.log('publication response: ', publication, info)

              if (publication.document?.content) {
                let content = JSON.parse(publication.document?.content)
                sendBack(
                  publicationModel.events.REPORT_DATA_REVEIVED({
                    publication: Object.assign(publication, {document: {...publication.document, content}}),
                    canUpdate: info.accountId == publication.document.author,
                  }),
                )
              } else {
                if (publication.document?.content === '') {
                  sendBack(publicationModel.events.REPORT_DATA_ERRORED('Content is Empty'))
                } else {
                  sendBack(publicationModel.events.REPORT_DATA_ERRORED('error parsing content'))
                }
              }
            })
            .catch((err) => {
              console.log('=== CATCH ERROR: publication fetch error', err)
              sendBack(publicationModel.events.REPORT_DATA_ERRORED('error fetching'))
            })
        },
      },
      on: {
        REPORT_DATA_REVEIVED: {
          target: 'ready',
          actions: publicationModel.assign((_, ev) => ({
            publication: ev.publication,
            canUpdate: ev.canUpdate,
          })),
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
      entry: (ctx) => {
        getInfo().then((response) => {
          if (response.accountId == ctx.publication?.document.author) {
          }
        })
      },
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
