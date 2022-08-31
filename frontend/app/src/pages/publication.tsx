import {BlockTools} from '@app/editor/block-tools'
import {BlockToolsProvider} from '@app/editor/block-tools-context'
import {blockToolsMachine} from '@app/editor/block-tools-machine'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {FileProvider} from '@app/file-provider'
import {PublicationRef} from '@app/main-machine'
import {MainWindow} from '@app/pages/window-components'
import {AppError} from '@app/root'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Discussion} from '@components/discussion'
import {Placeholder} from '@components/placeholder-box'
import {Text} from '@components/text'
import {useActor, useInterpret} from '@xstate/react'
import {useEffect} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {InterpreterFrom} from 'xstate'

type PublicationProps = {
  publicationRef: PublicationRef
  blockToolsService?: InterpreterFrom<typeof blockToolsMachine>
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

export default function Publication({
  publicationRef,
  blockToolsService,
}: PublicationProps) {
  let [state, send] = usePublication(publicationRef)
  const localBlockToolsService = useInterpret(() => blockToolsMachine)
  blockToolsService ||= localBlockToolsService
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

  if (state.matches('publication.ready')) {
    return (
      <ErrorBoundary
        FallbackComponent={AppError}
        onReset={() => window.location.reload()}
      >
        <MainWindow onScroll={() => blockToolsService.send('DISABLE')}>
          <FileProvider value={publicationRef}>
            <BlockToolsProvider value={blockToolsService}>
              {state.context.publication?.document?.content && (
                <>
                  <BlockTools
                    mode={EditorMode.Publication}
                    service={blockToolsService}
                  />
                  <Editor
                    editor={state.context.editor}
                    mode={EditorMode.Publication}
                    value={state.context.publication?.document.content}
                    onChange={() => {
                      blockToolsService.send('DISABLE')
                      // noop
                    }}
                  />
                </>
              )}
              <Box
                css={{
                  paddingBlock: '2rem',
                  paddingInlineStart: '1rem',
                  // maxWidth: '$prose-width',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <Button
                  variant="ghost"
                  color="primary"
                  size="1"
                  onClick={() => send('DISCUSSION.TOGGLE')}
                  css={{
                    paddingBlock: '2rem',
                    paddingInline: '1rem',
                    display: 'block',
                    inlineSize: '$full',
                    textAlign: 'start',
                    '&:hover': {
                      backgroundColor: '$base-background-normal',
                    },
                  }}
                >
                  {state.matches('discussion.ready.hidden') ? 'Show ' : 'Hide '}
                  Discussion/Citations
                </Button>
                <Discussion service={publicationRef} />
              </Box>
            </BlockToolsProvider>
          </FileProvider>
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
