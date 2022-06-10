// import 'show-keys'
import {AppError} from '@app/app'
import {Document} from '@app/client'
import {createDraftMachine} from '@app/draft-machine'
import {Editor} from '@app/editor/editor'
import {useMainPage} from '@app/main-page-context'
import {DraftRef} from '@app/main-page-machine'
import {getDateFormat} from '@app/utils/get-format-date'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {
  footerButtonsStyles,
  footerMetadataStyles,
  footerStyles,
  PageFooterSeparator,
} from '@components/page-footer'
import {Text} from '@components/text'
import {ChildrenOf} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {useEffect, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor} from 'slate'
import {StateFrom} from 'xstate'

export type EditorPageProps = {
  editor?: SlateEditor
  shouldAutosave?: boolean
  draftRef: DraftRef
}

export function useDraft(ref: DraftRef) {
  useEffect(() => {
    ref.send('LOAD')
    return () => {
      ref.send('UNLOAD')
    }
  }, [ref])

  return useActor(ref)
}

export default function EditorPage({draftRef}: EditorPageProps) {
  const [visible, setVisible] = useState(false)
  const mainPageService = useMainPage()
  const [state, send] = useDraft(draftRef)
  const {context} = state

  let disablePublish = state.hasTag('saving')

  if (state.matches('errored')) {
    return <Text>ERROR: {context.errorMessage}</Text>
  }

  if (state.matches('editing')) {
    return (
      <ErrorBoundary
        FallbackComponent={AppError}
        onReset={() => window.location.reload()}
      >
        <Box
          data-testid="editor-wrapper"
          css={{paddingHorizontal: '$5', paddingTop: '$5'}}
        >
          {context.localDraft?.content && (
            <>
              <Editor
                editor={state.context.editor}
                value={context.localDraft.content}
                //@ts-ignore
                onChange={(content: ChildrenOf<Document>) => {
                  if (!content && typeof content == 'string') return
                  send({type: 'DRAFT.UPDATE', payload: {content}})
                }}
              />

              <Box css={{margin: '$9', marginLeft: '$7'}}>
                <button type="button" onClick={() => setVisible((v) => !v)}>
                  toggle Value
                </button>
                {visible && (
                  <Box as="pre">
                    {JSON.stringify(context.localDraft.content, null, 2)}
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>
        <Box className={footerStyles()}>
          <Box className={footerButtonsStyles()}>
            <Button
              color="success"
              size="1"
              disabled={disablePublish}
              data-testid="submit-publish"
              onClick={() => {
                mainPageService.send('COMMIT.NEW.PUBLICATION')
              }}
            >
              Publish
            </Button>
          </Box>
          <Box className={footerMetadataStyles()}>
            <Text size="1" color="muted">
              Created on: {getDateFormat(context.draft, 'createTime')}
            </Text>
            <PageFooterSeparator />
            <Text size="1" color="muted">
              Last modified: {getDateFormat(context.draft, 'updateTime')}
            </Text>
            <PageFooterSeparator />
            <EditorStatus state={state} />
          </Box>
        </Box>
      </ErrorBoundary>
    )
  }

  return null
}

function EditorStatus({
  state,
}: {
  state: StateFrom<ReturnType<typeof createDraftMachine>>
}) {
  return (
    <Box
      css={{
        display: 'flex',
        gap: '$2',
        alignItems: 'center',
      }}
    >
      <Box
        css={{
          $$size: '$space$4',
          width: '$$size',
          height: '$$size',
          borderRadius: '$round',
          backgroundColor: state.matches('editing.idle')
            ? '$success-component-bg-active'
            : state.matches('editing.debouncing')
            ? '$base--component-bg-active'
            : state.matches('editing.saving')
            ? '$warning-component-bg-active'
            : '$danger-component-bg-active',
        }}
      />
      <Text color="muted" size="1">
        {state.matches('editing.idle')
          ? 'saved'
          : state.matches('editing.debouncing')
          ? 'unsaved'
          : state.matches('editing.saving')
          ? 'saving...'
          : ''}
      </Text>
    </Box>
  )
}
