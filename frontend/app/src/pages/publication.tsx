import {BlockHighLighter} from '@app/editor/block-highlighter'
import {Blocktools} from '@app/editor/blocktools'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {FileProvider} from '@app/file-provider'
import {useCurrentFile} from '@app/main-context'
import {PublicationRef} from '@app/main-machine'
import {MouseProvider} from '@app/mouse-context'
import {mouseMachine} from '@app/mouse-machine'
import {MainWindow} from '@app/pages/window-components'
import {AppError} from '@app/root'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Discussion} from '@components/discussion'
import {Icon} from '@components/icon'
import {Placeholder} from '@components/placeholder-box'
import {ScrollArea} from '@components/scroll-area'
import {Text} from '@components/text'
import {useActor, useInterpret} from '@xstate/react'
import {Allotment} from 'allotment'
import 'allotment/dist/style.css'
import {useEffect, useLayoutEffect, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import '../styles/publication.scss'

type PublicationProps = {
  publicationRef: PublicationRef
}

function usePublication(ref: PublicationRef) {
  useEffect(() => {
    ref.send('LOAD')
    return () => {
      ref.send('UNLOAD')
    }
  }, [ref])
  return useActor(ref)
}

export default function PublicationWrapper() {
  let file = useCurrentFile()

  if (file) {
    return <PublicationPage publicationRef={file as PublicationRef} />
  }

  return null
}

export function PublicationPage({publicationRef}: PublicationProps) {
  let [state, send] = usePublication(publicationRef)
  const mouseService = useInterpret(() => mouseMachine)

  let [qMatch, setQMatch] = useState({ready: false, value: false})

  useLayoutEffect(() => {
    let matchQuery = window.matchMedia('(min-width: 768px)')

    matchQuery.addEventListener('change', (event) => {
      console.log('change!', event)

      setQMatch({ready: true, value: event.matches})
    })

    setQMatch({ready: true, value: matchQuery.matches})
  }, [])

  if (state.matches('publication.fetching')) {
    return <PublicationShell />
  }

  // start rendering
  if (state.matches('publication.errored')) {
    return (
      <Box data-testid="publication-wrapper">
        <Text>Publication ERROR</Text>
        <Text>{state.context.errorMessage}</Text>
        <Button onClick={() => send('PUBLICATION.FETCH.DATA')} color="muted">
          try again
        </Button>
      </Box>
    )
  }

  if (state.hasTag('ready') && qMatch.ready) {
    return (
      <ErrorBoundary
        FallbackComponent={AppError}
        onReset={() => window.location.reload()}
      >
        <MainWindow>
          <div className="discussion-toggle">
            <button onClick={() => send('DISCUSSION.TOGGLE')}>
              <Icon name="MessageBubble" />
            </button>
          </div>
          <MouseProvider value={mouseService}>
            <BlockHighLighter>
              <Allotment
                vertical={!qMatch.value}
                onChange={() => {
                  mouseService.send('DISABLE.SCROLL')
                }}
              >
                <Allotment.Pane
                  preferredSize="40%"
                  visible={state.matches('discussion.ready.visible')}
                >
                  <ScrollArea
                    onScroll={() => mouseService.send('DISABLE.SCROLL')}
                  >
                    <Discussion service={publicationRef} />
                  </ScrollArea>
                </Allotment.Pane>
                <Allotment.Pane preferredSize="60%">
                  <ScrollArea
                    onScroll={() => mouseService.send('DISABLE.SCROLL')}
                    onMouseMove={(event) => {
                      mouseService.send({
                        type: 'MOUSE.MOVE',
                        position: event.clientY,
                      })
                    }}
                  >
                    <FileProvider value={publicationRef}>
                      {state.context.publication?.document?.content && (
                        <Blocktools>
                          <Editor
                            editor={state.context.editor}
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
                  </ScrollArea>
                </Allotment.Pane>
              </Allotment>
            </BlockHighLighter>
          </MouseProvider>
        </MainWindow>
      </ErrorBoundary>
    )
  }

  return null
}

function PublicationShell() {
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
