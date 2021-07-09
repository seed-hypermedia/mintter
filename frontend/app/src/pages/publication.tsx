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
import {useSidepanel, Sidepanel, useEnableSidepanel} from '../components/sidepanel'

export default function Publication(): JSX.Element {
  const {docId} = useParams<{docId: string}>()
  const history = useHistory()
  const [sidepanelState, sidepanelSend] = useSidepanel()

  useEnableSidepanel(sidepanelSend)
  // request document
  const {isLoading, isError, error, data} = useEditorPublication(docId)
  // const vvalue = useStoreEditorValue()
  // console.log('🚀 ~ file: publication.tsx ~ line 89 ~ useEditorPublication ~ vvalue', vvalue)

  const isSidepanelOpen = useMemo<boolean>(() => sidepanelState.matches('enabled.opened'), [sidepanelState.value])

  if (isLoading) {
    return <AppSpinner />
  }

  // start rendering
  if (isError) {
    console.error('usePublication error: ', error)
    return <Text>Publication ERROR</Text>
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
        // gap: '$5',
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
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          paddingHorizontal: '$5',
        }}
      >
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
      <Container css={{gridArea: 'maincontent', marginBottom: 300, padding: '$5', paddingTop: '$7'}}>
        <PublicationHeader document={data?.document} />
        <Separator />
        <Box css={{mx: '-$4', width: 'calc(100% + $7)'}}>
          <EditorComponent
            id="publication"
            value={data?.value?.blocks}
            editableProps={{readOnly: true}}
            sidepanelSend={sidepanelSend}
          />
        </Box>
      </Container>
      {isSidepanelOpen && <Sidepanel gridArea={'rightside'} />}
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
