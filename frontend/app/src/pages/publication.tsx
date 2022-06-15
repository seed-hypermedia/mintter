import {mainService as defaultMainService} from '@app/app-providers'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {FileProvider} from '@app/file-provider'
import {PublicationRef} from '@app/main-machine'
import {getDateFormat} from '@app/utils/get-format-date'
import {debug} from '@app/utils/logger'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Discussion} from '@components/discussion'
import {
  footerButtonsStyles,
  footerMetadataStyles,
  footerStyles,
  PageFooterSeparator,
} from '@components/page-footer'
import {Placeholder} from '@components/placeholder-box'
import {Text} from '@components/text'
import {TippingModal} from '@components/tipping-modal'
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
        css={{padding: '$5', paddingBottom: 0, marginBottom: 200}}
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

  return (
    <>
      {state.matches('publication.ready') && (
        <>
          <Box
            css={{padding: '$5', paddingBottom: 0, marginBottom: 50}}
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
              paddingHorizontal: 32,
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
        </>
      )}
      <Box className={footerStyles()}>
        <Box
          className={footerMetadataStyles()}
          css={{
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <Text size="1" color="muted">
            Created on:{' '}
            {getDateFormat(state.context.publication?.document, 'createTime')}
          </Text>
          <PageFooterSeparator />
          <Text size="1" color="muted">
            Last modified:{' '}
            {getDateFormat(state.context.publication?.document, 'updateTime')}
          </Text>
        </Box>
        <Box
          className={footerButtonsStyles()}
          css={{
            flex: 'none',
          }}
        >
          {state.context.canUpdate ? (
            <>
              <Button
                color="success"
                size="1"
                disabled={state.hasTag('pending')}
                data-testid="submit-edit"
                onClick={() =>
                  mainService.send({
                    type: 'COMMIT.EDIT.PUBLICATION',
                    docId: state.context.documentId,
                  })
                }
              >
                Edit
              </Button>
            </>
          ) : (
            <>
              <TippingModal
                publicationId={state.context.documentId}
                accountId={state.context.author?.id}
                visible={!state.context.canUpdate}
              />
              <Button
                size="1"
                variant="outlined"
                disabled={state.hasTag('pending')}
                data-testid="submit-review"
                onClick={() => {
                  debug('Review: IMPLEMENT ME!')
                }}
              >
                Review
              </Button>
              <Button
                variant="outlined"
                size="1"
                disabled={state.hasTag('pending')}
                data-testid="submit-edit"
                onClick={() => {
                  debug('Send: IMPLEMENT ME!')
                }}
              >
                Reply
              </Button>
            </>
          )}
          <Button
            onClick={() => mainService.send('COMMIT.OPEN.WINDOW')}
            size="1"
            color="primary"
          >
            New Document
          </Button>
        </Box>
      </Box>
    </>
  )
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
