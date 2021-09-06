import {useMemo} from 'react'
import {useHistory, useParams} from 'react-router-dom'
import type {Document} from '@mintter/client'
import {createDraft} from '@mintter/client'
import {usePublication} from '@mintter/client/hooks'
import {Text, Box, Button} from '@mintter/ui'
import {Container} from '../components/container'
import {AppSpinner} from '../components/app-spinner'
import {Separator} from '../components/separator'
import {getDateFormat} from '../utils/get-format-date'
import {useSidepanel, Sidepanel, useEnableSidepanel} from '../components/sidepanel'
import {Editor} from '../editor'

export default function Publication(): JSX.Element {
  const {docId} = useParams<{docId: string}>()
  const {send: sidepanelSend, isOpen: isSidepanelOpen} = useSidepanel()
  const {isLoading, isError, data, error} = usePublication(docId)

  useEnableSidepanel()

  async function handleUpdate() {
    try {
      const d = await createDraft(docId)
      if (d?.id) {
        // history.push({
        //   pathname: `/editor/${d.id}`,
        // })
        console.log('update document!!', d)
      }
    } catch (err) {
      console.warn(`createDraft Error: "createDraft" does not returned a Document`, err)
    }
  }

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
        <Button color="primary" shape="pill" size="2" onClick={handleUpdate}>
          UPDATE
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
      <Container css={{gridArea: 'maincontent', marginBottom: 300, padding: '$5', paddingTop: '$7'}}>
        <PublicationHeader document={data?.document} />
        <Separator />
        <Editor onChange={() => {}} readOnly value={data?.document?.content} />
      </Container>
      {isSidepanelOpen && <Sidepanel gridArea={'rightside'} />}
    </Box>
  )
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
