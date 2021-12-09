// import 'show-keys'
import {Box} from '@mintter/ui/box'
import {CSS} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
// import {getCurrent as getCurrentWindow} from '@tauri-apps/api/window'
import {useActor} from '@xstate/react'
import {getDateFormat} from 'frontend/app/src/utils/get-format-date'
import {
  FormEvent,
  // useLayoutEffect,
  useRef,
  useState,
} from 'react'
import toastFactory from 'react-hot-toast'
import {useQueryClient} from 'react-query'
import {useLocation} from 'wouter'
import {useSidepanel} from '../components/sidepanel'
import {useEnableSidepanel} from '../components/sidepanel/sidepanel'
import {Textarea} from '../components/textarea'
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
  const sidepanelService = useSidepanel()
  const [, sidepanelSend] = useActor(sidepanelService)
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

      sidepanelSend({type: 'SIDEPANEL_LOAD_ANNOTATIONS', document: context.localDraft.content})
    },
    client,
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

  useEnableSidepanel()

  if (state.matches('fetching')) {
    return <Text>fetching...</Text>
  }

  if (state.matches('idle.errored')) {
    return <Text>ERROR: {context.errorMessage}</Text>
  }

  if (state.matches('editing') && context.localDraft?.content) {
    return (
      <>
        <Box
          css={{
            marginBottom: 300,
            padding: '$5',
            '@bp2': {
              paddingTop: '$8',
              marginRight: '$9',
              marginLeft: 80,
            },
          }}
        >
          {/* <Button onClick={() => send('PUBLISH')} size="2" shape="pill" variant="outlined">
            Publish
          </Button> */}
          <Box css={{width: '$full', maxWidth: '64ch'}}>
            <Textarea
              css={{fontSize: '$4'} as CSS}
              data-testid="editor_title"
              name="title"
              placeholder="Document title"
              value={context?.localDraft?.title}
              onChange={(event: FormEvent<HTMLTextAreaElement>) => {
                // update window title as the user types
                // getCurrentWindow().setTitle(event.currentTarget.value)
                send({
                  type: 'UPDATE',
                  payload: {
                    title: event.currentTarget.value,
                  },
                })
              }}
            />
            {/* <Textarea
              css={
                {
                  color: '$text-muted',
                  fontSize: '$4',
                } as CSS
              }
              data-testid="editor_subtitle"
              name="subtitle"
              placeholder="about this publication..."
              value={context.localDraft.subtitle}
              onChange={(event) =>
                send({
                  type: 'UPDATE',
                  payload: {
                    subtitle: event.currentTarget.value,
                  },
                })
              }
            /> */}
            {/* <Separator css={{margin: '10px 0'}} /> */}
            {context.localDraft?.content && (
              <Box>
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
                      document: content,
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
        <Box
          css={{
            background: '$background-alt',
            width: '$full',
            position: 'absolute',
            bottom: 0,
            zIndex: '$max',
            padding: '$5',
            '@bp2': {
              paddingLeft: 96,
            },
            '&:after': {
              content: '',
              position: 'absolute',
              width: '$full',
              height: 20,
              background: 'linear-gradient(0deg, $colors$background-alt 0%, rgba(255,255,255,0) 100%)',
              top: -20,
              left: 0,
            },
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
            Created on: {getDateFormat(context.localDraft, 'createTime')}
          </Text>
          <Text size="1" color="muted">
            Last modified: {getDateFormat(context.localDraft, 'updateTime')}
          </Text>
          <EditorStatus state={state} />
        </Box>
      </>
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
