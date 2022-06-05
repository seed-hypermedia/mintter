import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {usePublicationRef} from '@app/files-context'
import {useMainPage, useParams} from '@app/main-page-context'
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

export default function Publication() {
  const publicationService = usePublicationRef()
  const mainPageService = useMainPage()
  let [state, send] = useActor(publicationService)

  const {docId} = useParams()

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
            <Editor
              mode={EditorMode.Publication}
              value={state.context.publication?.document.content}
              onChange={() => {
                // noop
              }}
            />
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
            <Discussion service={publicationService} />
          </Box>
        </>
      )}
      <Box className={footerStyles()}>
        <Box className={footerButtonsStyles()}>
          <Button
            onClick={() => mainPageService.send('OPEN_WINDOW')}
            size="1"
            color="primary"
          >
            New Document
          </Button>
          {state.context.canUpdate ? (
            <>
              <Button
                color="success"
                size="1"
                disabled={state.hasTag('pending')}
                data-testid="submit-edit"
                onClick={() =>
                  mainPageService.send({
                    type: 'EDIT_PUBLICATION',
                    docId,
                  })
                }
              >
                Edit
              </Button>
            </>
          ) : (
            <>
              <TippingModal
                publicationId={state.context.publication?.document.id}
                accountId={state.context.publication?.document.author}
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
        </Box>
        <Box className={footerMetadataStyles()}>
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
