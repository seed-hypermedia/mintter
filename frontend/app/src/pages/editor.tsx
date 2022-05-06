// import 'show-keys'
import {AppError} from '@app/app'
import {Document, DocumentChange, updateDraftV2} from '@app/client'
import {Editor} from '@app/editor/editor'
import {changesService} from '@app/editor/mintter-changes/plugin'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {
  draftEditorMachine,
  getTitleFromContent,
  useEditorDraft,
} from '@app/editor/use-editor-draft'
import {useMainPage, useParams} from '@app/main-page-context'
import {getDateFormat} from '@app/utils/get-format-date'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Text} from '@components/text'
import {ChildrenOf} from '@mintter/mttast'
import {useMemo, useRef, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import toastFactory from 'react-hot-toast'
import {useQueryClient} from 'react-query'
import {useLocation} from 'wouter'
import {StateFrom} from 'xstate'
import {EditorPageProps} from './types'
export default function EditorPage({
  editor: propEditor,
  shouldAutosave = true,
}: EditorPageProps) {
  const client = useQueryClient()
  const {docId} = useParams()
  const [, setLocation] = useLocation()
  const toast = useRef('')
  const [visible, setVisible] = useState(false)
  const localEditor = useMemo(
    () => buildEditorHook(plugins, EditorMode.Draft),
    [],
  )
  const mainPageService = useMainPage()

  const editor = propEditor ?? localEditor
  const [state, send] = useEditorDraft({
    editor,
    documentId: docId,
    client,
    mainPageService,
    shouldAutosave,
    options: {
      actions: {
        afterPublish: (context) => {
          if (!toast.current) {
            toast.current = toastFactory.success('Draft Published!', {
              position: 'top-center',
              duration: 2000,
            })
          } else {
            toastFactory.success('Draft Published!', {
              position: 'top-center',
              duration: 2000,
              id: toast.current,
            })
          }

          setLocation(
            `/p/${context.publication?.document?.id}/${context.publication?.version}`,
            {
              // we replace the history here because the draft url will not be available after.
              replace: true,
            },
          )
        },
        updateCurrentDocument: (context, event) => {
          if (event.type == 'EDITOR.REPORT.FETCH.SUCCESS') {
            mainPageService.send({
              type: 'SET.CURRENT.DOCUMENT',
              document: event.data,
            })
          }

          if (event.type == 'EDITOR.UPDATE') {
            mainPageService.send({
              type: 'SET.CURRENT.DOCUMENT',
              document: {
                ...context.localDraft,
                ...event.payload,
                content: event.payload.content || context.localDraft?.content,
              },
            })
          }
        },
        updateLibrary: () => {
          mainPageService.send('RECONCILE')
        },
      },
      services: {
        saveDraft: (context) => (sendBack) => {
          if (shouldAutosave) {
            ;(async function autosave() {
              let contentChanges = changesService.transformChanges(editor)
              console.log(
                '🚀 ~ file: editor.tsx ~ line 99 ~ autosave ~ contentChanges',
                contentChanges,
                editor,
              )
              let newTitle = getTitleFromContent(editor)
              console.log(
                '🚀 ~ file: editor.tsx ~ line 105 ~ autosave ~ newTitle',
                newTitle,
              )
              let changes: Array<DocumentChange> = newTitle
                ? [
                    ...contentChanges,
                    {
                      op: {
                        $case: 'setTitle',
                        setTitle: newTitle,
                      },
                    },
                  ]
                : contentChanges

              try {
                await updateDraftV2({
                  documentId: context.localDraft!.id!,
                  changes,
                })
                mainPageService.send({
                  type: 'SET.CURRENT.DOCUMENT',
                  document: context.localDraft!,
                })
                changesService.reset()
                sendBack('EDITOR.UPDATE.SUCCESS')
              } catch (err: any) {
                sendBack({
                  type: 'EDITOR.UPDATE.ERROR',
                  errorMessage: err.message,
                })
              }
            })()
          }
        },
      },
    },
  })

  const {context} = state

  // useLayoutEffect(() => {
  //   if (context.localDraft?.title) {
  //     // set the window title to reflect the documents title
  //     getCurrentWindow().setTitle(context.localDraft.title)
  //   } else {
  //     getCurrentWindow().setTitle('Untitled Document')
  //   }
  // }, [context.localDraft?.title])

  if (state.matches('errored')) {
    return <Text>ERROR: {context.errorMessage}</Text>
  }

  if (state.matches('editing')) {
    return (
      <ErrorBoundary
        FallbackComponent={AppError}
        onReset={() => window.location.reload()}
      >
        <Box data-testid="editor-wrapper">
          {context.localDraft?.content && (
            <Box css={{}}>
              <Editor
                editor={editor}
                value={context.localDraft.content}
                //@ts-ignore
                onChange={(content: ChildrenOf<Document>) => {
                  if (!content && typeof content == 'string') return
                  send({type: 'EDITOR.UPDATE', payload: {content}})
                }}
              />

              <Box css={{margin: '$9', marginLeft: '$7'}}>
                <button type="button" onClick={() => setVisible((v) => !v)}>
                  toggle Value
                </button>
                {visible && (
                  <Box as="pre" css={{}}>
                    {JSON.stringify(context.localDraft.content, null, 2)}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
        <Box
          css={{
            background: '$background-alt',
            width: '$full',
            position: 'absolute',
            bottom: 0,
            zIndex: '$max',
            display: 'flex',
            justifyContent: 'space-between',
            '&:after': {
              content: '',
              position: 'absolute',
              width: '$full',
              height: 20,
              background:
                'linear-gradient(0deg, $colors$background-alt 0%, rgba(255,255,255,0) 100%)',
              top: -20,
              left: 0,
            },
          }}
        >
          <Box
            css={{
              flex: 1,
              background: '$background-alt',
              padding: '$5',
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
              Created on: {getDateFormat(context.localDraft!, 'createTime')}
            </Text>
            <Text size="1" color="muted">
              Last modified: {getDateFormat(context.localDraft!, 'updateTime')}
            </Text>
            <EditorStatus state={state} />
          </Box>
          <Box
            css={{
              display: 'flex',
              gap: '$5',
              padding: '$5',
              paddingRight: 0,
              alignItems: 'center',
            }}
          >
            <Button
              size="1"
              variant="outlined"
              disabled={!state.hasTag('canPublish')}
              onClick={() => {
                console.log('Review: IMPLEMENT ME!')
              }}
            >
              Review
            </Button>
            <Button
              variant="outlined"
              size="1"
              disabled={!state.hasTag('canPublish')}
              onClick={() => {
                console.log('Reply: IMPLEMENT ME!')
              }}
            >
              Reply
            </Button>
            <Button
              color="success"
              size="1"
              disabled={!state.hasTag('canPublish')}
              onClick={() => {
                send('EDITOR.PUBLISH')
              }}
            >
              Publish
            </Button>
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
  state: StateFrom<ReturnType<typeof draftEditorMachine>>
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
            ? '$success-softer'
            : state.matches('editing.debouncing')
            ? '$background-muted'
            : state.matches('editing.saving')
            ? '$warning-soft'
            : '$danger-soft',
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
