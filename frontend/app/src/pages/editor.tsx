// import 'show-keys'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Text} from '@mintter/ui/text'
import {TextField} from '@mintter/ui/text-field'
import {getCurrent as getCurrentWindow} from '@tauri-apps/api/window'
import {FormEvent, useEffect, useRef, useState} from 'react'
import toastFactory from 'react-hot-toast'
import {useQueryClient} from 'react-query'
import {useLocation} from 'wouter'
import {Separator} from '../components/separator'
import {useEnableSidepanel, useSidepanel} from '../components/sidepanel'
import {Editor, useEditorDraft} from '../editor'
import type {DraftEditorMachineContext, DraftEditorMachineState} from '../editor/use-editor-draft'

type EditorPageProps = {
  params?: {docId: string}
}

export default function EditorPage({params}: EditorPageProps) {
  const client = useQueryClient()
  const [, setLocation] = useLocation()
  const toast = useRef('')
  const [visible, setVisible] = useState(false)

  const {send: sidepanelSend, isOpen: isSidepanelOpen} = useSidepanel()

  const [state, send] = useEditorDraft({
    documentId: params!.docId,
    afterPublish: (context: DraftEditorMachineContext) => {
      if (!toast.current) {
        toast.current = toastFactory.success('Draft Published!', {position: 'top-center', duration: 2000})
      } else {
        toastFactory.success('Draft Published!', {position: 'top-center', duration: 2000, id: toast.current})
      }

      setLocation(`/p/${context.localDraft?.id}`, {
        // we replace the history here because the draft url will not be available after publish.
        replace: true,
      })
    },
    loadAnnotations: (context: DraftEditorMachineContext) => {
      if (!context.localDraft) return

      sidepanelSend({type: 'SIDEPANEL_LOAD_ANNOTATIONS', payload: context.localDraft.content})
    },
    client,
  })

  const {context} = state

  useEffect(() => {
    if (context.localDraft?.title) {
      // set the window title to reflect the documents title
      getCurrentWindow().setTitle(context.localDraft.title)
    } else {
      getCurrentWindow().setTitle('Untitled Document')
    }
  }, [context.localDraft?.title])

  useEnableSidepanel()

  if (state.matches('fetching')) {
    return <Text>fetching...</Text>
  }

  if (state.matches('idle.errored')) {
    return <Text>ERROR: {context.errorMessage}</Text>
  }

  if (state.matches('editing') && context.localDraft?.content) {
    return (
      // <HoverProvider>

      <Box
        css={{
          // gridArea: 'maincontent',
          // width: '100%',
          marginBottom: 300,
          padding: '$5',
          '@bp2': {
            paddingTop: '$8',
            marginRight: '$9',
            marginLeft: 80,
          },
        }}
      >
        <Button onClick={() => send('PUBLISH')} size="2" shape="pill" variant="outlined">
          Publish
        </Button>

        <Box css={{width: '$full', maxWidth: '64ch'}}>
          <EditorStatus state={state} />
          <TextField
            // @todo: Fix types
            // @ts-ignore
            textarea
            data-testid="editor_title"
            name="title"
            placeholder="Document title"
            value={context?.localDraft?.title}
            onChange={(event: FormEvent<HTMLInputElement>) => {
              // update window title as the user types
              getCurrentWindow().setTitle(event.currentTarget.value)

              send({
                type: 'UPDATE',
                payload: {
                  title: event.currentTarget.value,
                },
              })
            }}
            rows={1}
            css={{
              $$backgroundColor: 'transparent',
              $$borderColor: 'transparent',
              $$hoveredBorderColor: 'transparent',
              fontSize: '$7',
              fontWeight: '$bold',
              letterSpacing: '0.01em',
              lineHeight: '$1',
            }}
          />
          <TextField
            textarea
            data-testid="editor_subtitle"
            name="subtitle"
            placeholder="about this publication..."
            value={context.localDraft.subtitle}
            onChange={(event: FormEvent<HTMLInputElement>) =>
              send({
                type: 'UPDATE',
                payload: {
                  subtitle: event.currentTarget.value,
                },
              })
            }
            rows={1}
            css={{
              $$backgroundColor: 'transparent',
              $$borderColor: 'transparent',
              $$hoveredBorderColor: 'transparent',
              fontSize: '$5',
              lineHeight: '1.25',
            }}
          />
          <Separator />
          {context.localDraft?.content && (
            <Box css={{marginHorizontal: '$4'}}>
              <Editor
                value={context.localDraft.content}
                onChange={(content) => {
                  send({
                    type: 'UPDATE',
                    payload: {
                      content,
                    },
                  })
                  sidepanelSend({
                    type: 'SIDEPANEL_LOAD_ANNOTATIONS',
                    payload: content,
                  })
                }}
              />

              <Box css={{marginTop: 40}}>
                <button type="button" onClick={() => setVisible((v) => !v)}>
                  toggle Value
                </button>
                {visible && (
                  <Box
                    as="pre"
                    css={{
                      padding: 20,
                      backgroundColor: '$background-muted',
                      overflowX: 'scroll',
                    }}
                  >
                    {JSON.stringify(context.localDraft.content, null, 2)}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    )
  }

  return null
}

function EditorStatus({state}: {state: DraftEditorMachineState}) {
  return (
    <Box
      css={{
        display: 'flex',
        gap: '$2',
        alignItems: 'center',
        paddingHorizontal: '$4',
        paddingVertical: '$2',
        marginTop: '$5',
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
