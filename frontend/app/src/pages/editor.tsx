import 'show-keys'
import {useMemo, useRef, useState} from 'react'
import {Box, Button, Text, TextField} from '@mintter/ui'
import toast from 'react-hot-toast'
import {useHistory, useParams} from 'react-router'
import {Container} from '../components/container'
import {Separator} from '../components/separator'
import {EditorComponent} from '../editor/editor-component'
import {AppSpinner} from '../components/app-spinner'
import {AutosaveStatus} from '../editor/autosave'
import {useEditorDraft} from '../editor/use-editor-draft'
import {useStoreEditorValue} from '@udecode/slate-plugins'

export default function EditorPage() {
  const {docId} = useParams<{docId: string}>()
  const history = useHistory()
  const {isLoading, isError, error, data} = useEditorDraft(docId)
  const vvalue = useStoreEditorValue()
  // console.log('🚀 ~ editor.tsx ~ line 89 ~ vvalue', vvalue)

  async function handleSave() {
    // console.log('save now!!')
    await data?.save()
    toast.success('Draft saved!', {position: 'top-center', duration: 4000})
  }

  async function handlePublish() {
    // TODO: getting an error when publishing since the draft is being removed
    // queryClient.cancelQueries(docId)
    await data?.publish()
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
        // gridTemplateAreas: isSidepanelOpen
        //   ? `"controls controls controls"
        // "maincontent maincontent rightside"`
        //   : `"controls controls controls"
        // "maincontent maincontent maincontent"`,
        gridTemplateAreas: `"controls controls controls"
        "maincontent maincontent maincontent"`,
        gridTemplateColumns: 'minmax(300px, 25%) 1fr minmax(300px, 25%)',
        gridTemplateRows: '64px 1fr',
        gap: '$5',
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
        }}
      >
        <Button color="primary" shape="pill" size="2" onClick={handlePublish}>
          PUBLISH
        </Button>
        {/* <Button size="1" onClick={() => sidepanelSend?.({type: 'SIDEPANEL_TOOGLE'})}>
          toggle sidepanel
        </Button> */}
      </Box>
      <Container css={{gridArea: 'maincontent', marginBottom: 300}}>
        <AutosaveStatus save={data.save} />
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
          <EditorComponent value={data?.value.blocks} />
        </Box>
      </Container>
    </Box>
  )
}
