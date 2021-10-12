// import 'show-keys'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Text} from '@mintter/ui/text'
import {TextField} from '@mintter/ui/text-field'
import {FormEvent, useRef} from 'react'
import toastFactory from 'react-hot-toast'
import {useQueryClient} from 'react-query'
import {useLocation, useRoute} from 'wouter'
import {Container} from '../components/container'
import {PageLayout} from '../components/page-layout'
import {Separator} from '../components/separator'
import {Sidepanel, useEnableSidepanel, useSidepanel} from '../components/sidepanel'
import {Editor, useEditorDraft} from '../editor'
import type {DraftEditorMachineContext, DraftEditorMachineState} from '../editor/use-editor-draft'

export default function EditorPage() {
  const [, params] = useRoute<{docId: string}>('/editor/:docId')
  const client = useQueryClient()
  const [, setLocation] = useLocation()
  const toast = useRef('')

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
      <PageLayout isSidepanelOpen={isSidepanelOpen} data-testid="editor-wrapper">
        <Box
          css={{
            display: 'flex',
            gridArea: 'controls',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '$2',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            paddingHorizontal: '$5',
          }}
        >
          <Button color="primary" shape="pill" size="2" onClick={() => send({type: 'PUBLISH'})}>
            PUBLISH
          </Button>
          <Button
            data-testid="sidepanel-button"
            size="1"
            color="muted"
            variant="outlined"
            onClick={() => {
              sidepanelSend('SIDEPANEL_TOGGLE')
            }}
          >
            {`${isSidepanelOpen ? 'Close' : 'Open'} sidepanel`}
          </Button>
        </Box>
        <Container
          css={{
            gridArea: 'maincontent',
            marginBottom: 300,
            paddingTop: '$7',
          }}
        >
          <EditorStatus state={state} />
          <TextField
            // @todo: Fix types
            // @ts-ignore
            textarea
            data-testid="editor_title"
            name="title"
            placeholder="Document title"
            value={context?.localDraft?.title}
            onChange={(event: FormEvent<HTMLInputElement>) =>
              send({
                type: 'UPDATE',
                payload: {
                  title: event.currentTarget.value,
                },
              })
            }
            rows={1}
            css={{
              $$backgroundColor: '$colors$background-alt',
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
              $$backgroundColor: '$colors$background-alt',
              $$borderColor: 'transparent',
              $$hoveredBorderColor: 'transparent',
              fontSize: '$5',
              lineHeight: '1.25',
            }}
          />
          <Separator />
          {context.localDraft?.content && (
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
          )}
        </Container>
        {isSidepanelOpen && <Sidepanel gridArea="rightside" />}
      </PageLayout>
      // </HoverProvider>
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
