import {BlockHighLighter} from '@app/editor/block-highlighter'
import {Blocktools} from '@app/editor/blocktools'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {FileProvider} from '@app/file-provider'
import {useMain} from '@app/main-context'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {createPublicationMachine} from '@app/publication-machine'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Placeholder} from '@components/placeholder-box'
import {useLocation, useRoute} from '@components/router'
import {ScrollArea} from '@components/scroll-area'
import {useQueryClient} from '@tanstack/react-query'
import {useInterpret, useMachine} from '@xstate/react'
import 'allotment/dist/style.css'
import {useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import '../styles/publication.scss'

export default function PublicationWrapper() {
  let client = useQueryClient()
  let mainService = useMain()

  let [, params] = useRoute('/p/:id/:version/:block?')
  let [, setLocation] = useLocation()
  let mouseService = useInterpret(() => mouseMachine)
  let editor = useMemo(
    () => buildEditorHook(plugins, EditorMode.Publication),
    [],
  )

  let [state, send, service] = useMachine(
    () =>
      createPublicationMachine({
        client,
        editor,
        documentId: params?.id,
        version: params?.version,
      }),
    {
      actions: {
        sendActorToParent: () => {
          mainService.send({type: 'COMMIT.CURRENT.PUBLICATION', service})
        },
        onEditSuccess: (_, event) => {
          setLocation(`/d/${event.data.id}`)
        },
      },
    },
  )

  if (state.matches('publication.fetching')) {
    return <PublicationShell />
  }

  if (state.matches('publication.errored')) {
    return (
      <div data-testid="publication-wrapper" className="page-wrapper">
        <p>Publication ERROR</p>
        <p>{state.context.errorMessage}</p>
        <Button onClick={() => send('PUBLICATION.FETCH.DATA')} color="muted">
          try again
        </Button>
      </div>
    )
  }

  if (state.matches('publication.ready')) {
    return (
      <div
        data-testid="publication-wrapper"
        className="page-wrapper"
        onMouseMove={(event) =>
          mouseService.send({type: 'MOUSE.MOVE', position: event.clientY})
        }
      >
        <ErrorBoundary
          fallback={<div>error</div>}
          onReset={() => window.location.reload()}
        >
          <ScrollArea onScroll={() => mouseService.send('DISABLE.SCROLL')}>
            <MouseProvider value={mouseService}>
              <BlockHighLighter>
                <FileProvider value={service}>
                  {state.context.publication?.document?.content && (
                    <Blocktools editor={editor}>
                      <Editor
                        editor={editor}
                        mode={EditorMode.Publication}
                        value={state.context.publication?.document.content}
                        onChange={() => {
                          mouseService.send('DISABLE.CHANGE')
                          // noop
                        }}
                      />
                    </Blocktools>
                  )}
                </FileProvider>
              </BlockHighLighter>
            </MouseProvider>
          </ScrollArea>
        </ErrorBoundary>
      </div>
    )
  }
  return null
}

function PublicationShell() {
  // TODO: update shell
  return (
    <Box
      css={{
        width: '$full',
        padding: '$7',
        paddingTop: '$9',
        display: 'flex',
        flexDirection: 'column',
        gap: '$7',
      }}
    >
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
    </Box>
  )
}

function BlockPlaceholder() {
  return (
    <Box
      css={{
        width: '$prose-width',
        display: 'flex',
        flexDirection: 'column',
        gap: '$3',
      }}
    >
      <Placeholder css={{height: 24, width: '$full'}} />
      <Placeholder css={{height: 24, width: '92%'}} />
      <Placeholder css={{height: 24, width: '84%'}} />
      <Placeholder css={{height: 24, width: '90%'}} />
    </Box>
  )
}
