import {useEffect, useMemo, useRef, useState} from 'react'
import {Box, Button, Text, TextField} from '@mintter/ui'
import toast from 'react-hot-toast'
import {useParams} from 'react-router'
import {useMutation, useQueryClient, UseQueryResult} from 'react-query'

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
import {AppSpinner} from '../components/app-spinner'
import {SAVING} from 'slate-history'

export default function EditorPage() {
  const {docId} = useParams<{docId: string}>()
  const queryClient = useQueryClient()
  const {isLoading, isError, error, data} = useEditorDraft(docId)

  // sidepanel
  const {isSidepanelOpen, sidepanelObjects, sidepanelSend} = useSidePanel()

  async function save() {
    // console.log('save now!!')
    await data?.save()
    toast.success('Draft saved!', {position: 'top-center', duration: 4000})
  }

  // const {status} = useAutosave(save)

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
        {/* <Button color="primary" shape="pill" size="2" onClick={saveDocument}>
          PUBLISH
        </Button> */}
        <Button size="1" onClick={() => sidepanelSend?.({type: 'SIDEPANEL_TOOGLE'})}>
          toggle sidepanel
        </Button>
      </Box>
      <Container css={{gridArea: 'maincontent', marginBottom: 300}}>
        <AutosaveStatus save={save} />
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

const message = {
  error: {
    color: 'danger',
    text: 'error saving document!',
  },
  loading: {
    color: 'muted',
    text: 'saving...',
  },
  success: {
    color: 'success',
    text: 'draft saved!',
  },
}

function AutosaveStatus({save}) {
  const {status, isLoading} = useAutosave(save)

  return (
    <Box css={{paddingHorizontal: '$5'}}>
      {message[status] ? <Text color={message[status].color}>{message[status].text}</Text> : <Text></Text>}
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
  const queryClient = useQueryClient()
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

  const {mutateAsync: save} = useMutation(
    async () => {
      const {id, author} = document
      const {title, subtitle} = value
      console.log('🚀 ~ file: ', {title, subtitle})
      const newDoc = toDocument({
        id,
        author,
        title,
        subtitle,
        blocks: currentEditorValue,
      })
      return await updateDraft(newDoc)
    },
    {
      onMutate: async () => {
        await queryClient.cancelQueries(['Draft', document?.id])
        await queryClient.invalidateQueries('DraftList')

        const previousDraft = queryClient.getQueryData<Document>(['Draft', document?.id])

        const newDraft = toDocument({
          id: document.id,
          title: value.title,
          subtitle: value.subtitle,
          author: document.author,
          blocks: currentEditorValue,
        })

        if (previousDraft) {
          queryClient.setQueryData<Document>(['Draft', document?.id], newDraft)
        }

        return {previousDraft, newDraft}
      },
    },
  )

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

function useAutosave(cb) {
  let [key, setKey] = useState<number>(0)

  const shouldSave = useDebounce(key, 1000)

  const {mutateAsync, status, isLoading, isIdle} = useMutation(cb)
  console.log('🚀 ~ file: editor.tsx ~ line 276 ~ useAutosave ~ isIdle', isIdle)

  const onKeyDownEvent = (event: KeyboardEvent) => {
    setKey(key++)
  }

  useEffect(() => {
    window.addEventListener('keydown', onKeyDownEvent)

    return () => {
      window.removeEventListener('keydown', onKeyDownEvent)
    }
  }, [])

  useEffect(async () => {
    if (shouldSave) {
      await mutateAsync()
    }
  }, [shouldSave])

  return {isLoading, status}
}

function useDebounce(value, delay) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value)
      }, delay)
      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler)
      }
    },
    [value, delay], // Only re-call effect if value or delay changes
  )
  return debouncedValue
}
