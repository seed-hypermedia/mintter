import {useEffect, useMemo, useRef, useState} from 'react'
import {Box, Button, Text, TextField} from '@mintter/ui'

import {useParams} from 'react-router'
import {useMutation, UseQueryResult} from 'react-query'

import {useDraft, useAccount} from '@mintter/client/hooks'

import {Container} from '../components/container'
import {Separator} from '../components/separator'

import {useSidePanel} from '../sidepanel'
import {EditorComponent} from '../editor/editor-component'
import 'show-keys'
import {toDocument} from '../editor/to-document'
import type {EditorBlock} from '../editor/types'
import {ListStyle, Document, updateDraft} from '@mintter/client'
import {toEditorValue} from '../editor/to-editor-value'
import {ELEMENT_BLOCK} from '../editor/block-plugin'
import {createId} from '@mintter/client/mocks'
import {useReducer} from 'react'
import {EditorAction, editorReducer, EditorState, initialValue, useEditorReducer} from '../editor/editor-reducer'
import {useStoreEditorValue} from '@udecode/slate-plugins'

export default function EditorPage() {
  const {docId} = useParams<{docId: string}>()
  const {isLoading, isError, error, data} = useEditorDraft(docId)

  // sidepanel
  const {isSidepanelOpen, sidepanelObjects, sidepanelSend} = useSidePanel()

  function save() {
    data?.save()
  }

  if (isError) {
    console.error('useDraft error: ', error)
    return <Text>Editor ERROR</Text>
  }

  if (isLoading) {
    return <Text>loading draft...</Text>
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
        <Button color="success" shape="pill" size="2" onClick={save}>
          SAVE
        </Button>
        {/* <Button color="primary" shape="pill" size="2" onClick={saveDocument}>
          PUBLISH
        </Button> */}
        <Button size="1" onClick={() => sidepanelSend?.({type: 'SIDEPANEL_TOOGLE'})}>
          toggle sidepanel
        </Button>
      </Box>
      <Container css={{gridArea: 'maincontent', marginBottom: 300}}>
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
          <EditorComponent
            value={data?.value.blocks}
            // onChange={(value: Array<EditorBlock>) => {
            //   console.log('changed!', value)
            //   data?.send({type: 'editor', payload: value})
            // }}
          />
        </Box>
      </Container>
      {isSidepanelOpen ? (
        <Box
          css={{
            backgroundColor: '$background-muted',
            overflow: 'auto',
            gridArea: 'rightside',
            color: '$text-opposite',
            padding: '$4',
          }}
        >
          <pre>
            <code>{JSON.stringify({}, null, 2)}</code>
          </pre>
        </Box>
      ) : null}
    </Box>
  )
}

type UseEditorValue = {
  value: EditorState
  send: React.Dispatch<EditorAction>
  save: (d: Document) => Promise<Document>
  publish: () => Promise<void>
}

function useEditorDraft(documentId: string): UseQueryResult<UseEditorValue> {
  // set local state
  /**
   * need to do:
   * - fetch draft
   * - convert draft into editor value
   * - effect to autosave draft
   * need to return:
   * - editor value
   * - publish function
   */
  const draftQuery = useDraft(documentId)
  const [value, send] = useEditorReducer()
  const currentEditorValue = useStoreEditorValue('editor')
  const document = useMemo(() => draftQuery.data, [draftQuery.data])

  useEffect(() => {
    if (draftQuery.isSuccess && draftQuery.data) {
      const {title, subtitle} = draftQuery.data
      send({
        type: 'full',
        payload: {
          title,
          subtitle,
          blocks: toEditorValue(draftQuery.data),
        },
      })
    }
  }, [draftQuery.data])

  const {mutateAsync: publish} = useMutation(async () => {
    // const document = createDocument()
    // // publishDraft
    // console.log({document})
    console.log('publish!!!')
  })

  const {mutateAsync: save} = useMutation(async () => {
    const {id, author} = document
    const newDoc = toDocument({
      id,
      author,
      blocks: currentEditorValue,
    })

    console.log('save document!', newDoc)

    return await updateDraft(newDoc)
  })

  return {
    ...draftQuery,
    data: {
      value,
      send,
      save,
      publish,
    },
  }
}
