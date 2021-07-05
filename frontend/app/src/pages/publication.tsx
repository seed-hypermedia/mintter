import {useMemo, useEffect} from 'react'
import {useHistory, useParams} from 'react-router-dom'
import slugify from 'slugify'
import type {Publication as TPublication, Document} from '@mintter/client'
import {useDocument, useDraftsList, usePublication, usePublication as usePublicationQuery} from '@mintter/client/hooks'
import {useSidePanel} from '../sidepanel'
import {Text, Box, Button} from '@mintter/ui'
import {Container} from '../components/container'
import {mockDocument} from '@mintter/client/mocks'
import {EditorState, useEditorReducer} from '../editor/editor-reducer'
import {EditorComponent} from '../editor/editor-component'
import {toEditorValue} from '../editor/to-editor-value'
import {AppSpinner} from '../components/app-spinner'
import type {UseQueryResult} from 'react-query'

export default function Publication(): JSX.Element {
  const {docId} = useParams<{docId: string}>()
  const history = useHistory()
  // request document
  const {isLoading, isError, error, data} = useEditorPublication(docId)
  console.log('🚀 ~ file: publication.tsx ~ line 19 ~ Publication ~ data', data)

  // start rendering
  if (isError) {
    console.error('usePublication error: ', error)
    return <Text>Publication ERROR</Text>
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
      data-testid="publication-wrapper"
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
        {/* <Button size="1" onClick={() => sidepanelSend?.({type: 'SIDEPANEL_TOOGLE'})}>
          toggle sidepanel
        </Button> */}
      </Box>
      <Container css={{gridArea: 'maincontent', marginBottom: 300}}>
        <PublicationHeader document={data?.document} />
        <Box css={{mx: '-$4', width: 'calc(100% + $7)'}}>
          <EditorComponent value={data?.value?.blocks} />
        </Box>
      </Container>
      {/* <PublicationModal document={data.document} /> */}
    </Box>
  )
}

type UseEditorPublicationValue = {
  document?: Document
  version?: string
  value?: EditorState
}

function useEditorPublication(publicationId: string): UseQueryResult<UseEditorPublicationValue> {
  const publicationQuery = usePublication(publicationId)
  const [value, send] = useEditorReducer()

  useEffect(() => {
    if (publicationQuery.isSuccess && publicationQuery.data) {
      const {title, subtitle} = publicationQuery.data.document
      send({
        type: 'full',
        payload: {
          title,
          subtitle,
          blocks: toEditorValue(publicationQuery.data.document),
        },
      })
    }
  }, [publicationQuery.data])

  return {
    ...publicationQuery,
    data: {
      document: publicationQuery.data?.document,
      version: publicationQuery.data?.version,
      value,
    },
  }
}

function PublicationHeader({document}: {document?: Document}) {
  return document ? (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '$3',
        marginBottom: '$5',
        paddingBottom: '$5',
        position: 'relative',
      }}
    >
      <Box css={{display: 'flex', gap: '$4', alignItems: 'center'}}>
        <Box
          css={{
            background: '$background-neutral',
            width: 32,
            height: 32,
            borderRadius: '$round',
          }}
        />
        <Text size="6">Horacio (TODO)</Text>
      </Box>
      <Text as="h1" size="8">
        {document.title}
      </Text>
      <Text size="6" color="alt" css={{marginTop: '$5'}}>
        Published on:
      </Text>
      {document.subtitle && (
        <Text color="muted" size="6">
          {document.subtitle}
        </Text>
      )}
      <Box
        css={{
          borderBottom: '2px dotted $colors$background-contrast-soft',
          height: 0,
          maxWidth: '60%',
          margin: '20px 0',
        }}
      />
    </Box>
  ) : null
}

function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement('textarea')
  textArea.value = text

  // Avoid scrolling to bottom
  textArea.style.top = '0'
  textArea.style.left = '0'
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  let result

  try {
    document.execCommand('copy')
    result = true
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err)
    result = false
  }

  document.body.removeChild(textArea)
  return result
}

function copyTextToClipboard(text: string) {
  if (!navigator.clipboard) {
    return fallbackCopyTextToClipboard(text)
  }
  return navigator.clipboard.writeText(text).then(
    () => {
      // console.log('Async: Copying to clipboard was successful!!')
      return true
    },
    (err) => {
      console.error('Async: Could not copy text: ', err)
      return false
    },
  )
}
