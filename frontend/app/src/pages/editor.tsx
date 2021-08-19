import 'show-keys'
import {useMemo} from 'react'
import {Box, Button, Text, TextField} from '@mintter/ui'
import toast from 'react-hot-toast'
import {useHistory, useParams} from 'react-router'
import {Container} from '../components/container'
import {Separator} from '../components/separator'
import {AppSpinner} from '../components/app-spinner'
import {useEnableSidepanel, useSidepanel, Sidepanel} from '../components/sidepanel'
import {plugins, useEditorDraft, Editor, DraftEditorMachineContext} from '../editor'
import {assign} from 'xstate'

export default function EditorPage() {
  const {docId} = useParams<{docId: string}>()
  const history = useHistory()
  const [state, send] = useEditorDraft({
    documentId: docId,
    afterSave: (context, event) => {
      toast.success('Draft saved!', {position: 'top-center', duration: 4000})
    },
    afterPublish: (context: DraftEditorMachineContext, event) => {
      toast.success('Draft Published!', {position: 'top-center', duration: 4000})
      history.push(`/p/${context.localDraft?.id}`)
    },
  })

  const {context} = state

  const [sidepanelState, sidepanelSend] = useSidepanel()

  useEnableSidepanel(sidepanelSend)

  const isSidepanelOpen = useMemo<boolean>(() => sidepanelState.matches('enabled.opened'), [sidepanelState.value])

  if (state.matches('fetching')) {
    return <AppSpinner />
  }

  if (state.matches('idle.errored')) {
    return <Text>ERROR: {context.errorMessage}</Text>
  }

  if (state.matches('editing')) {
    return (
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
        <Container css={{gridArea: 'maincontent', marginBottom: 300, paddingTop: '$7'}}>
          <TextField
            // TODO: Fix types
            // @ts-ignore
            as="textarea"
            data-testid="editor_title"
            name="title"
            placeholder="Document title"
            value={context.localDraft.title}
            onChange={(event) =>
              send({
                type: 'UPDATE',
                payload: {
                  title: event.target.value,
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
            value={context.localDraft.subtitle}
            onChange={(event) =>
              send({
                type: 'UPDATE',
                payload: {
                  subtitle: event.target.value,
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
          <Editor
            value={context.localDraft.content}
            onChange={(content) =>
              send({
                type: 'UPDATE',
                payload: {
                  content,
                },
              })
            }
          />
        </Container>
        {isSidepanelOpen && <Sidepanel gridArea="rightside" />}
      </Box>
    )
  }

  return null
}
