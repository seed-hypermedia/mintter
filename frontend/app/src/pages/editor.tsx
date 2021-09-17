// import 'show-keys'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Text} from '@mintter/ui/text'
import {TextField} from '@mintter/ui/text-field'
import {FormEvent, useRef} from 'react'
import toastFactory from 'react-hot-toast'
import {useQueryClient} from 'react-query'
import {useHistory, useParams} from 'react-router'
import {AppSpinner} from '../components/app-spinner'
import {Container} from '../components/container'
import {Separator} from '../components/separator'
import {Sidepanel, useEnableSidepanel, useSidepanel} from '../components/sidepanel'
import type {DraftEditorMachineContext} from '../editor'
import {Editor, useEditorDraft} from '../editor'
import {HoverProvider} from '../editor/hover-machine'

export default function EditorPage() {
  const {docId} = useParams<{docId: string}>()
  const client = useQueryClient()
  const history = useHistory()
  const toast = useRef('')

  const {send: sidepanelSend, isOpen: isSidepanelOpen} = useSidepanel()

  const [state, send] = useEditorDraft({
    documentId: docId,
    afterSave: () => {
      if (!toast.current) {
        toast.current = toastFactory.success('Draft saved!', {position: 'top-center', duration: 2000})
      } else {
        toastFactory.success('Draft saved!', {position: 'top-center', duration: 2000, id: toast.current})
      }
    },
    afterPublish: (context: DraftEditorMachineContext) => {
      if (!toast.current) {
        toast.current = toastFactory.success('Draft Published!', {position: 'top-center', duration: 2000})
      } else {
        toastFactory.success('Draft Published!', {position: 'top-center', duration: 2000, id: toast.current})
      }

      history.push(`/p/${context.localDraft?.id}`)
    },
    loadAnnotations: (context: DraftEditorMachineContext) => {
      sidepanelSend({type: 'SIDEPANEL_LOAD_ANNOTATIONS', payload: context.localDraft?.content})
    },
    client,
  })

  useEnableSidepanel()

  const {context} = state

  if (state.matches('fetching')) {
    return <AppSpinner />
  }

  if (state.matches('idle.errored')) {
    return <Text>ERROR: {context.errorMessage}</Text>
  }

  if (state.matches('editing')) {
    return (
      <HoverProvider>
        <Box
          css={{
            display: 'grid',
            minHeight: '$full',
            gridTemplateAreas: isSidepanelOpen
              ? `"controls controls controls"
          "maincontent maincontent rightside"`
              : `"controls controls controls"
          "maincontent maincontent maincontent"`,
            gridTemplateColumns: 'minmax(350px, 15%) 1fr minmax(350px, 40%)',
            gridTemplateRows: '64px 1fr',
          }}
          data-testid="editor-wrapper"
        >
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
            <TextField
              // TODO: Fix types
              // @ts-ignore
              as="textarea"
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
              // TODO: Fix types
              // @ts-ignore
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
              // TODO: Fix types
              // @ts-ignore
              as="textarea"
              data-testid="editor_subtitle"
              name="subtitle"
              placeholder="about this publication..."
              value={context?.localDraft?.subtitle}
              onChange={(event: FormEvent<HTMLInputElement>) =>
                send({
                  type: 'UPDATE',
                  payload: {
                    subtitle: event.currentTarget.value,
                  },
                })
              }
              rows={1}
              // TODO: Fix types
              // @ts-ignore
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
        </Box>
      </HoverProvider>
    )
  }

  return null
}
