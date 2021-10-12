import {createDraft} from '@mintter/client'
import {useAccount, useInfo, usePublication} from '@mintter/client/hooks'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Text} from '@mintter/ui/text'
import {EditorMode} from 'frontend/app/src/editor/plugin-utils'
import {useEffect} from 'react'
import {useLocation, useRoute} from 'wouter'
import {Container} from '../components/container'
import {PageLayout} from '../components/page-layout'
import {Separator} from '../components/separator'
import {Sidepanel, useEnableSidepanel, useSidepanel} from '../components/sidepanel'
import {Editor} from '../editor'
import {getDateFormat} from '../utils/get-format-date'

export default function Publication() {
  const [, params] = useRoute<{docId: string}>('/p/:docId')
  const [, setLocation] = useLocation()
  const {send: sidepanelSend, isOpen: isSidepanelOpen, annotations} = useSidepanel()
  const {status, data, error} = usePublication(params!.docId)
  const {data: author} = useAccount(data.document.author, {
    enabled: !!data?.document?.author,
  })
  const {data: myInfo} = useInfo()

  useEnableSidepanel()

  useEffect(() => {
    if (status == 'success') {
      sidepanelSend({type: 'SIDEPANEL_LOAD_ANNOTATIONS', payload: data.document.content})
    }
  }, [status])

  async function handleUpdate() {
    try {
      const d = await createDraft(params!.docId)
      if (d?.id) {
        setLocation(`/editor/${d.id}`)
      }
    } catch (err) {
      console.warn(`createDraft Error: "createDraft" does not returned a Document`, err)
    }
  }

  if (status == 'loading') {
    return <Text>loading...</Text>
  }

  // start rendering
  if (status == 'error') {
    console.error('usePublication error: ', error)
    return <Text>Publication ERROR</Text>
  }

  let canUpdate = author?.id == myInfo?.accountId

  return (
    // <HoverProvider>
    <PageLayout isSidepanelOpen={isSidepanelOpen} data-testid="publication-wrapper">
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
        {canUpdate && (
          <Button color="success" shape="pill" size="2" onClick={handleUpdate}>
            UPDATE
          </Button>
        )}
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
        <Editor mode={EditorMode.Publication} value={data?.document?.content} />
      </Container>
      {isSidepanelOpen && <Sidepanel gridArea={'rightside'} />}
    </PageLayout>
    // </HoverProvider>
  )
}

function PublicationHeader({document}: {document?: EditorDocument}) {
  const {data: author} = useAccount(document?.author, {
    enabled: !!document?.author,
  })

  return document ? (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '$3',
        position: 'relative',
      }}
    >
      {author && (
        <Box css={{display: 'flex', gap: '$4', alignItems: 'center'}}>
          <Box
            css={{
              background: '$background-neutral',
              width: 24,
              height: 24,
              borderRadius: '$round',
            }}
          />
          <Text size="2">{author.profile?.alias}</Text>
        </Box>
      )}
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
