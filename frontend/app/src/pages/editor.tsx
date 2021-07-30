import 'show-keys'
import {useMemo} from 'react'
import {Box, Button, Text, TextField} from '@mintter/ui'
import toast from 'react-hot-toast'
import {useHistory, useParams} from 'react-router'
import {Container} from '../components/container'
import {Separator} from '../components/separator'
import {AppSpinner} from '../components/app-spinner'
import {useEnableSidepanel, useSidepanel, Sidepanel} from '../components/sidepanel'
import {plugins, useEditorDraft, Editor} from '../editor'
import {assign} from 'xstate'

export default function EditorPage() {
  const {docId} = useParams<{docId: string}>()
  const history = useHistory()
  const [state, send] = useEditorDraft(docId, {
    actions: {
      saveDraft: assign(async (context, event) => {
        // save to backend

        const saved = true
        toast.success('Draft saved!', {position: 'top-center', duration: 4000})
        return {
          prevDraft: context.localDraft,
        }
      }),
    },
  })

  const {context} = state

  const [sidepanelState, sidepanelSend] = useSidepanel()

  useEnableSidepanel(sidepanelSend)

  const isSidepanelOpen = useMemo<boolean>(() => sidepanelState.matches('enabled.opened'), [sidepanelState.value])

  async function handleSave() {
    // console.log('save now!!')
    // await data?.save()
    toast.success('Draft saved!', {position: 'top-center', duration: 4000})
  }

  async function handlePublish() {
    // TODO: getting an error when publishing since the draft is being removed
    // queryClient.cancelQueries(docId)
    // await data?.publish()
    toast.success('Draft Published!', {position: 'top-center', duration: 4000})
    history.push('/library')
  }

  if (state.matches('fetching')) {
    return <AppSpinner />
  }

  if (state.matches('idle.errored')) {
    return <p>ERROR: {context.errorMessage}</p>
  }

  if (state.matches('editing.idle') || state.matches('editing.debouncing')) {
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
          // gridTemplateAreas: `"controls controls controls"
          // "maincontent maincontent maincontent"`,
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
            paddingHorizontal: '$5',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
          }}
        >
          <Button color="primary" shape="pill" size="2" onClick={handlePublish}>
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
          {/* <AutosaveStatus save={data.save} /> */}
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
          <Box css={{mx: '-$4', width: 'calc(100% + $7)'}}>
            <Editor
              plugins={plugins}
              value={context.localDraft.children}
              onChange={(value) =>
                send({
                  type: 'UPDATE',
                  payload: {
                    children: value,
                  },
                })
              }
            />
          </Box>
        </Container>
        {isSidepanelOpen && <Sidepanel gridArea="rightside" />}
      </Box>
    )
  }

  return null
}

function _EditorPage() {
  const {docId} = useParams<{docId: string}>()
  const history = useHistory()

  console.log('🚀 ~ file: editor.tsx ~ line 22 ~ EditorPage ~ value', data)

  const [sidepanelState, sidepanelSend] = useSidepanel()

  useEnableSidepanel(sidepanelSend)

  const isSidepanelOpen = useMemo<boolean>(() => sidepanelState.matches('enabled.opened'), [sidepanelState.value])

  async function handleSave() {
    // console.log('save now!!')
    // await data?.save()
    toast.success('Draft saved!', {position: 'top-center', duration: 4000})
  }

  async function handlePublish() {
    // TODO: getting an error when publishing since the draft is being removed
    // queryClient.cancelQueries(docId)
    // await data?.publish()
    toast.success('Draft Published!', {position: 'top-center', duration: 4000})
    history.push('/library')
  }

  if (isError) {
    console.error('useDraft error: ', error)
    return <Text>Editor ERROR</Text>
  }

  if (isLoading) {
    return <AppSpinner />
  }

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
        // gridTemplateAreas: `"controls controls controls"
        // "maincontent maincontent maincontent"`,
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
          paddingHorizontal: '$5',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <Button color="primary" shape="pill" size="2" onClick={handlePublish}>
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
        {/* <AutosaveStatus save={data.save} /> */}
        <TextField
          // TODO: Fix types
          // @ts-ignore
          as="textarea"
          data-testid="editor_title"
          name="title"
          placeholder="Document title"
          value={data?.value.title}
          onChange={(event) => data.send({type: 'title', payload: event.target.value})}
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
          value={data?.value.subtitle}
          onChange={(event) => data.send({type: 'subtitle', payload: event.target.value})}
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
        <Box css={{mx: '-$4', width: 'calc(100% + $7)'}}>
          <Editor
            plugins={plugins}
            value={data?.value.children}
            onChange={(payload) => data.send({type: 'children', payload})}
          />
        </Box>
      </Container>
      {isSidepanelOpen && <Sidepanel gridArea="rightside" />}
    </Box>
  )
}
