import {mainService as defaultMainService} from '@app/app-providers'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {FileProvider} from '@app/file-provider'
import {PublicationRef} from '@app/main-machine'
import {MainWindow} from '@app/pages/window-components'
import {debug} from '@app/utils/logger'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Discussion} from '@components/discussion'
import {FileTime} from '@components/file-time'
import {Icon} from '@components/icon'
import {
  headerButtonsStyles,
  headerMetadataStyles,
  headerStyles,
} from '@components/page-header'
import {Placeholder} from '@components/placeholder-box'
import {Text} from '@components/text'
import {TippingModal} from '@components/tipping-modal'
import {Tooltip} from '@components/tooltip'
import {useActor} from '@xstate/react'
import {useEffect} from 'react'

type PublicationProps = {
  publicationRef: PublicationRef
  mainService?: typeof defaultMainService
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
  mainService = defaultMainService,
}: PublicationProps) {
  let [state, send] = usePublication(publicationRef)

  if (state.matches('publication.fetching')) {
    return <PublicationShell />
  }

  // start rendering
  if (state.matches('publication.errored')) {
    return (
      <Box
        css={{
          paddingTop: '$5',
          marginBottom: 200,
        }}
        data-testid="publication-wrapper"
      >
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
      <MainWindow>
        <Box className={headerStyles()}>
          <Box
            className={headerMetadataStyles()}
            css={{
              flex: 1,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileTime
              type="pub"
              document={state.context.publication?.document}
            />
          </Box>
          <Box
            className={headerButtonsStyles()}
            css={{
              flex: 'none',
            }}
          >
            {state.context.canUpdate ? (
              <>
                <Tooltip content="Edit">
                  <Button
                    color="success"
                    size="1"
                    variant="ghost"
                    disabled={state.hasTag('pending')}
                    data-testid="submit-edit"
                    onClick={() =>
                      mainService.send({
                        type: 'COMMIT.EDIT.PUBLICATION',
                        docId: state.context.documentId,
                      })
                    }
                  >
                    <Icon size="1" name="PencilAdd" color="muted" />
                  </Button>
                </Tooltip>
              </>
            ) : (
              <>
                <TippingModal
                  publicationId={state.context.documentId}
                  accountId={state.context.author?.id}
                  visible={!state.context.canUpdate}
                />
                <Tooltip content="Review">
                  <Button
                    color="success"
                    size="1"
                    variant="ghost"
                    disabled={state.hasTag('pending')}
                    data-testid="submit-edit"
                    onClick={() => {
                      debug('Review: IMPLEMENT ME!')
                    }}
                  >
                    <Icon size="1" name="MessageBubble" color="muted" />
                  </Button>
                </Tooltip>
                <Tooltip content="Reply">
                  <Button
                    color="success"
                    size="1"
                    variant="ghost"
                    disabled={state.hasTag('pending')}
                    data-testid="submit-edit"
                    onClick={() => {
                      debug('Review: IMPLEMENT ME!')
                    }}
                  >
                    <Icon size="1" name="ArrowTurnTopRight" color="muted" />
                  </Button>
                </Tooltip>
              </>
            )}
            <Tooltip content="new Document">
              <Button
                variant="ghost"
                size="0"
                color="success"
                onClick={() => mainService.send('COMMIT.OPEN.WINDOW')}
                css={{
                  '&:hover': {
                    backgroundColor: '$success-component-bg-normal',
                  },
                }}
              >
                <Icon name="File" size="1" />
              </Button>
            </Tooltip>
          </Box>
        </Box>
        <Box
          css={{
            height: '$full',
          }}
        >
          <Box
            css={{
              paddingBottom: 0,
              marginBottom: 50,
            }}
            data-testid="publication-wrapper"
          >
            {state.context.publication?.document?.content && (
              <FileProvider value={publicationRef}>
                <Editor
                  editor={state.context.editor}
                  mode={EditorMode.Publication}
                  value={state.context.publication?.document.content}
                  onChange={() => {
                    // noop
                  }}
                />
              </FileProvider>
            )}
          </Box>
          <Box
            css={{
              marginBottom: 200,
              marginLeft: '$8',
              marginRight: '$5',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '$4',
            }}
          >
            <Button
              variant="ghost"
              color="primary"
              size="1"
              onClick={() => send('DISCUSSION.TOGGLE')}
            >
              {state.matches('discussion.ready.hidden') ? 'Show ' : 'Hide '}
              Discussion/Citations
            </Button>
            <Discussion service={publicationRef} mainService={mainService} />
          </Box>
        </Box>
      </MainWindow>
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
