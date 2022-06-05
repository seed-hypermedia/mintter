// import 'show-keys'
import {AppError} from '@app/app'
import {
  Document,
  DocumentChange,
  publishDraft as apiPublishDraft,
  updateDraftV2 as apiUpdateDraft,
} from '@app/client'
import {Editor} from '@app/editor/editor'
import {changesService} from '@app/editor/mintter-changes/plugin'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {draftEditorMachine, useEditorDraft} from '@app/editor/use-editor-draft'
import {useFilesService} from '@app/files-context'
import {useMainPage, useParams} from '@app/main-page-context'
import {getTitleFromContent} from '@app/utils/get-document-title'
import {getDateFormat} from '@app/utils/get-format-date'
import {debug} from '@app/utils/logger'
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
import {useMemo, useRef, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import toastFactory from 'react-hot-toast'
import {useQueryClient} from 'react-query'
import {StateFrom} from 'xstate'
import {EditorPageProps} from './types'
export default function EditorPage({
  editor: propEditor,
  shouldAutosave = true,
  publishDraft = apiPublishDraft,
  updateDraft = apiUpdateDraft,
}: EditorPageProps) {
  const client = useQueryClient()
  const {docId} = useParams()
  const toast = useRef('')
  const [visible, setVisible] = useState(false)
  const localEditor = useMemo(
    () => buildEditorHook(plugins, EditorMode.Draft),
    [],
  )
  const mainPageService = useMainPage()
  const filesService = useFilesService()

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
          if (context.publication && context.publication.document) {
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

            filesService.send({
              type: 'COMMIT.PUBLICATION',
              publication: context.publication,
            })

            mainPageService.send({
              type: 'goToPublication',
              docId: context.publication?.document?.id,
              version: context.publication?.version,
              replace: true,
            })
          } else {
            if (!toast.current) {
              toast.current = toastFactory.error('Error after publishing', {
                position: 'top-center',
                duration: 2000,
              })
            } else {
              toastFactory.error('Error after publishing', {
                position: 'top-center',
                duration: 2000,
                id: toast.current,
              })
            }
          }
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
        resetChanges: () => {
          changesService.reset()
        },
      },
      services: {
        saveDraft: (context) => (sendBack) => {
          if (shouldAutosave) {
            ;(async function autosave() {
              let contentChanges = changesService.transformChanges(editor)
              let newTitle = getTitleFromContent(editor)
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

              debug('=== CHANGES:', JSON.stringify(changes))
              try {
                await updateDraft({
                  documentId: context.localDraft!.id!,
                  changes,
                })
                mainPageService.send({
                  type: 'SET.CURRENT.DOCUMENT',
                  document: context.localDraft!,
                })
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
        publishDraftService: (context, event) => (sendBack) => {
          if (!context.localDraft) return

          publishDraft(context.localDraft.id!)
            .then((publication) => {
              sendBack({type: 'EDITOR.PUBLISH.SUCCESS', publication})
            })
            .catch((err: any) => {
              sendBack({
                type: 'EDITOR.PUBLISH.ERROR',
                errorMessage: err.message,
              })
            })
        },
      },
    },
  })

  const {context} = state
  console.log('🚀 ~ file: editor.tsx ~ line 175 ~ context', context)

  let disablePublish = !state.context.canPublish || state.hasTag('saving')
  console.log(
    '🚀 ~ file: editor.tsx ~ line 177 ~ disablePublish',
    disablePublish,
    state.context.canPublish,
    state.hasTag('saving'),
  )
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
        <Box
          data-testid="editor-wrapper"
          css={{paddingHorizontal: '$5', paddingTop: '$5'}}
        >
          {context.localDraft?.content && (
            <>
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
                send('EDITOR.PUBLISH')
              }}
            >
              Publish
            </Button>
          </Box>
          <Box className={footerMetadataStyles()}>
            <Text size="1" color="muted">
              Created on: {getDateFormat(context.prevDraft!, 'createTime')}
            </Text>
            <PageFooterSeparator />
            <Text size="1" color="muted">
              Last modified: {getDateFormat(context.prevDraft!, 'updateTime')}
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
