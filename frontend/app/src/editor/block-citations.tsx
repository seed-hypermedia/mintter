import {Account, getAccount, Link, Publication} from '@app/client'
import {useBlockCitations} from '@app/editor/citations'
import {css} from '@app/stitches.config'
import {getBlock} from '@app/utils/get-block'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import {Text} from '@components/text'
import {FlowContent} from '@mintter/mttast'
import {useMachine} from '@xstate/react'
import {useQueryClient} from 'react-query'
import {assign, createMachine} from 'xstate'

export type BlockCitationsProps = {
  blockId: string
}

export function BlockCitations({blockId}: BlockCitationsProps) {
  const blockCitations = useBlockCitations(blockId)
  const [state, send] = useMachine(blockCitationsMachine)
  return blockCitations.length ? (
    <Box
      contentEditable={false}
      css={{
        padding: '$4',
        width: '$full',
        maxWidth: 240,
        marginTop: '-$5',
        '@bp2': {
          transform: 'translateX(100%)',
          position: 'absolute',
          right: 0,
          top: 4,
          overflow: 'hidden',
        },
      }}
    >
      <button className={citationsButton()} onClick={() => send('TOGGLE')}>
        <Box className={`citation-index ${citationCount()}`}>{blockCitations.length}</Box>
        <Text color="primary" fontWeight="bold" size="1">
          {state.matches('collapsed') ? 'Show' : 'Hide'} citations
        </Text>
      </button>
      {state.matches('expanded') ? (
        <Box
          as="ul"
          css={{
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '$3',
          }}
        >
          {blockCitations.map((citation) => (
            <BlockCitationItem key={citation.source?.blockId} citation={citation} />
          ))}
        </Box>
      ) : null}
    </Box>
  ) : null
}

var citationsButton = css({
  all: 'unset',
  padding: '$2',
  borderRadius: '$2',
  display: 'flex',
  alignItems: 'center',
  gap: '$3',
  '&:hover': {
    background: '$block-hover',
    '& .citation-index': {},
  },
})

var citationCount = css({
  width: 24,
  height: 24,
  borderRadius: '$2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '$block-hover',
  // background: 'green',
  fontFamily: '$default',
  fontSize: '$1',
  color: '$text-muted',
  textAlign: 'center',
  '& span': {
    background: 'red',
    display: 'block',
  },
})

var blockCitationsMachine = createMachine({
  initial: 'collapsed',
  context: {},
  states: {
    collapsed: {
      on: {
        EXPAND: 'expanded',
        TOGGLE: 'expanded',
      },
    },
    expanded: {
      on: {
        COLLAPSE: 'collapsed',
        TOGGLE: 'collapsed',
      },
    },
  },
})

type BlockCitationItemProps = {
  citation: Link
}

function BlockCitationItem({citation}: BlockCitationItemProps) {
  const client = useQueryClient()

  const [state, send] = useMachine(
    //@ts-ignore
    () =>
      blockCitationMachine.withConfig({
        services: {
          fetchCitation: () => (sendBack) => {
            ;(async () => {
              let data = await getBlock(citation.source)
              let author = await getAccount(data?.publication.document?.author || '')
              if (data) {
                sendBack({
                  type: 'CITATION.FETCH.SUCCESS',
                  data: {
                    ...data,
                    author,
                  },
                })
              } else {
                sendBack({type: 'CITATION.FETCH.ERROR'})
              }
            })()
          },
        },
        actions: {
          assignContextValue: assign({
            publication: (_, event) => event.data.publication,
            block: (_, event) => event.data.block,
            author: (_, event) => event.data.author,
          }),
          assignFetchError: assign({
            errorMessage: 'Error fetching',
          }),
          clearErrorMessage: assign({
            errorMessage: '',
          }),
        },
      }),
  )

  let title = state.context?.publication?.document?.title || 'Untitled Document'
  let authorAlias = state.context?.author?.profile?.alias || 'anonymous'

  return (
    <Box
      css={{
        padding: '$3',
        // background: '$block-hover',
        borderRadius: '$2',
        display: 'flex',
        flexDirection: 'column',
        gap: '$2',
      }}
    >
      <Text size="1" fontWeight="bold" color="default">
        {title}
      </Text>
      <Box
        css={{
          display: 'flex',
          gap: '$2',
          alignItems: 'center',
        }}
      >
        <Avatar size="1" />
        <Text size="1" color="muted">
          {authorAlias}
        </Text>
      </Box>
    </Box>
  )
}

const blockCitationMachine = createMachine({
  initial: 'loading',
  context: {
    publication: null as Publication | null,
    block: null as FlowContent | null,
    author: null as Account | null,
    errorMessage: '',
  },
  states: {
    loading: {
      invoke: {
        id: 'fetchCitation',
        src: 'fetchCitation',
      },
      on: {
        ['CITATION.FETCH.SUCCESS']: {
          target: 'ready',
          actions: ['assignContextValue'],
        },
        ['CITATION.FETCH.ERROR']: {
          target: 'errored',
          actions: ['assignFetchError'],
        },
      },
    },
    ready: {},
    errored: {
      on: {
        RETRY: {
          target: 'loading',
          actions: ['clearErrorMessage'],
        },
      },
    },
  },
})
