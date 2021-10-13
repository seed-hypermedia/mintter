import {createDraft} from '@mintter/client'
import {useAccount, useInfo, usePublication} from '@mintter/client/hooks'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {css, styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {useEffect} from 'react'
import {useLocation, useRoute} from 'wouter'
import {Avatar} from '../components/avatar'
import {PageLayout} from '../components/page-layout'
import {Sidepanel, useEnableSidepanel, useSidepanel} from '../components/sidepanel'
import {Editor} from '../editor'
import {EditorMode} from '../editor/plugin-utils'
import {getDateFormat} from '../utils/get-format-date'

const Heading = styled('h1', {
  fontSize: '$5',
  width: '$full',
  maxWidth: 445,
  margin: 0,
  padding: 0,
})

const headerFooterStyle = css({
  gridArea: 'footer',
  $$gap: '$space$5',
  display: 'flex',
  gap: '$$gap',
  alignItems: 'center',
  '& span': {
    position: 'relative',
  },
  '& span:not(:first-child):before': {
    content: `"|"`,
    color: '$text-muted',
    position: 'absolute',
    left: -8,
    top: 0,
  },
})

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
      <Box
        css={{
          gridArea: 'maincontent',
          width: '90%',
          marginBottom: 300,
          padding: '$5',
          paddingTop: '$8',
          marginHorizontal: '$4',
          '@bp2': {
            paddingTop: '$9',
            marginHorizontal: '$9',
          },
        }}
      >
        <PublicationHeader document={data?.document} />
        <Box css={{marginTop: 50, width: '$full', maxWidth: '64ch'}}>
          <Editor mode={EditorMode.Publication} value={data?.document?.content} />
        </Box>
      </Box>
      {isSidepanelOpen && <Sidepanel gridArea={'rightside'} />}
    </PageLayout>
  )
}

function PublicationHeader({document}: {document?: EditorDocument}) {
  const {data: author} = useAccount(document?.author, {
    enabled: !!document?.author,
  })
  const {isOpen} = useSidepanel()

  return document ? (
    <Box
      css={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gridTemplateRows: '32px min-content min-content min-content',
        gridTemplateAreas: `"author"
        "title"
        "footer"
        "citation-toolbar"`,
        gap: '$5',

        '@bp2': {
          gridTemplateColumns: isOpen ? '1fr' : '440px auto',
          gridTemplateRows: isOpen ? '32px min-content min-content min-content' : '32px min-content min-content',
          gridTemplateAreas: isOpen
            ? `"author"
          "title"
          "footer"
          "citation-toolbar"`
            : `"author author"
        "title citation-toolbar"
        "footer footer"`,
        },
      }}
    >
      {author && (
        <Box css={{gridArea: 'author', display: 'flex', gap: '$3', alignItems: 'center'}}>
          <Avatar size="3" />
          <Text size="3" fontWeight="medium">
            {author.profile?.alias}
          </Text>
        </Box>
      )}
      <Heading css={{gridArea: 'title'}}>{document.title}</Heading>
      {/* {document.subtitle && (
          <Text color="muted" size="4">
            {document.subtitle}
          </Text>
        )} */}
      <Box className={headerFooterStyle()}>
        <Text size="1" color="muted">
          {getDateFormat(document, 'publishTime')}
        </Text>
        <Text size="1" color="muted">
          Version 3
        </Text>
        <Text size="1" color="primary" css={{textDecoration: 'underline'}}>
          View Versions
        </Text>
        <Text color="muted" size="1">
          Tipped $0.09
        </Text>
      </Box>
      <Box
        css={{
          gridArea: 'citation-toolbar',
          marginLeft: '-$3',
          '@bp2': {
            marginLeft: isOpen ? '-$5' : 0,
            marginTop: '-$3',
          },
        }}
      >
        <Box css={{display: 'flex', alignItems: 'center', gap: '$3'}}>
          <Button size={{'@initial': '1', '@bp2': '2'}} variant="ghost" color="primary">
            View Discussion (13)
          </Button>
          <Text color="muted">|</Text>
          <Button size={{'@initial': '1', '@bp2': '2'}} variant="ghost" color="primary">
            Mention
          </Button>
          <Text color="muted">|</Text>
          <Button size={{'@initial': '1', '@bp2': '2'}} variant="ghost" color="success">
            Tip Author
          </Button>
        </Box>
      </Box>
    </Box>
  ) : null
}
