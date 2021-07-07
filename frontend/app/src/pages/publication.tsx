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
import {Separator} from '../components/separator'
import {useSlatePluginsActions, useStoreEditorValue} from '@udecode/slate-plugins'
import {getDateFormat} from '../utils/get-format-date'

export default function Publication(): JSX.Element {
  const {docId} = useParams<{docId: string}>()
  const history = useHistory()
  // request document
  const {isLoading, isError, error, data} = useEditorPublication(docId)
  const vvalue = useStoreEditorValue()
  // console.log('🚀 ~ file: publication.tsx ~ line 89 ~ useEditorPublication ~ vvalue', vvalue)

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
        <Separator />
        <Box css={{mx: '-$4', width: 'calc(100% + $7)'}}>
          <EditorComponent id="publication" value={data?.value?.blocks} editableProps={{readOnly: true}} />
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
  const {setValue} = useSlatePluginsActions()

  useEffect(() => {
    if (publicationQuery.isSuccess && publicationQuery.data) {
      const {title, subtitle} = publicationQuery.data.document
      let blocks = toEditorValue(publicationQuery.data.document)
      send({
        type: 'full',
        payload: {
          title,
          subtitle,
          blocks,
        },
      })

      setValue(blocks, 'publication')
    }
  }, [publicationQuery.data, publicationId])

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
        position: 'relative',
      }}
    >
      {/* <Box css={{display: 'flex', gap: '$4', alignItems: 'center'}}>
        <Box
          css={{
            background: '$background-neutral',
            width: 24,
            height: 24,
            borderRadius: '$round',
          }}
        />
        <Text size="2"></Text>
      </Box> */}
      <Text size="9" css={{fontWeight: '$bold'}}>
        {document.title}
      </Text>
      {document.subtitle && (
        <Text color="muted" size="7">
          {document.subtitle}
        </Text>
      )}
      <Text size="2" color="alt" css={{marginTop: '$5'}}>
        Published on: {getDateFormat(document, 'publishTime')}
      </Text>
    </Box>
  ) : null
}
