import {isEmbed, isLink} from '@mintter/mttast'
import {document} from '@mintter/mttast-builder'
import {Box} from '@mintter/ui/box'
import {Icon} from '@mintter/ui/icon'
import {styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {MouseEvent, useEffect, useRef, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import toast from 'react-hot-toast'
import {visit} from 'unist-util-visit'
import {useLocation} from 'wouter'
import {createModel} from 'xstate/lib/model'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {Editor} from '../../editor'
import {Dropdown} from '../../editor/dropdown'
import {getEmbedIds, useEmbed} from '../../editor/embed'
import {EditorMode} from '../../editor/plugin-utils'
import {copyTextToClipboard} from '../../editor/statement'
import {useAccount} from '../../hooks'
import {getDateFormat} from '../../utils/get-format-date'
import {useBookmarks, useBookmarksService} from '../bookmarks'
import {ScrollArea} from '../scroll-area'
import {useAnnotations, useIsSidepanelOpen, useSidepanel} from './sidepanel-context'

export const sidepanelModel = createModel(
  {
    annotations: [] as Array<string>,
    bookmarks: [] as Array<string>,
  },
  {
    events: {
      SIDEPANEL_LOAD_ANNOTATIONS: (document: any) => ({document}),
      SIDEPANEL_ENABLE: () => ({}),
      SIDEPANEL_DISABLE: () => ({}),
      SIDEPANEL_OPEN: () => ({}),
      SIDEPANEL_TOGGLE: () => ({}),
    },
  },
)

export const sidepanelMachine = sidepanelModel.createMachine({
  id: 'sidepanel',
  initial: 'disabled',
  context: sidepanelModel.initialContext,
  states: {
    disabled: {
      on: {
        SIDEPANEL_ENABLE: {
          target: 'enabled.hist',
        },
      },
      entry: 'setBookmarks',
    },
    enabled: {
      id: 'enabled',
      on: {
        SIDEPANEL_DISABLE: {
          target: 'disabled',
        },
        SIDEPANEL_LOAD_ANNOTATIONS: {
          actions: sidepanelModel.assign(
            {
              annotations: (_, event) => {
                let nodes = [] as Array<string>

                visit(
                  document(event.document),
                  (n) => isEmbed(n) || (isLink(n) && n.url.includes(MINTTER_LINK_PREFIX)),
                  (node) => {
                    if ('url' in node) {
                      nodes.push(node.url)
                    }
                  },
                )

                return nodes
              },
            },
            'SIDEPANEL_LOAD_ANNOTATIONS',
          ),
        },
      },
      initial: 'closed',
      states: {
        closed: {
          on: {
            SIDEPANEL_OPEN: {
              target: 'opened',
            },
            SIDEPANEL_TOGGLE: {
              target: 'opened',
            },
          },
        },
        opened: {
          on: {
            SIDEPANEL_TOGGLE: {
              target: 'closed',
            },
          },
        },
        hist: {
          type: 'history',
          history: 'shallow',
        },
      },
    },
  },
})

export function useEnableSidepanel() {
  const service = useSidepanel()
  useEffect(() => {
    service.send('SIDEPANEL_ENABLE')

    return () => {
      service.send('SIDEPANEL_DISABLE')
    }
  }, [service])
}

export type SidepanelProps = {
  gridArea: string
}

export function Sidepanel() {
  const isOpen = useIsSidepanelOpen()
  const bookmarks = useBookmarks()
  const annotations = useAnnotations()

  return (
    <Box
      css={{
        gridArea: 'sidepanel',
        borderLeft: '1px solid rgba(0,0,0,0.1)',
        width: isOpen ? '30vw' : 0,
        overflow: 'scroll',
        position: 'relative',
      }}
    >
      <ScrollArea>
        {annotations.length ? (
          <Box
            css={{
              padding: '$5',
            }}
          >
            <Text fontWeight="bold">Annotations</Text>
            {annotations.map((item) => {
              return (
                <ErrorBoundary fallback={<span>sidepanel item fallback</span>}>
                  <SidepanelItem key={item} item={item} remove={false} />
                </ErrorBoundary>
              )
            })}
          </Box>
        ) : null}
        {bookmarks.length ? (
          <Box
            css={{
              padding: '$5',
            }}
          >
            <Text fontWeight="bold">Bookmarks</Text>
            {bookmarks.map(({link}) => {
              return (
                <ErrorBoundary fallback={<span>sidepanel item fallback</span>}>
                  <SidepanelItem key={link} item={link} />
                </ErrorBoundary>
              )
            })}
          </Box>
        ) : null}
      </ScrollArea>
    </Box>
  )
}

export type SidepanelItemProps = {
  item: string
  remove?: boolean
}

export function SidepanelItem({item, remove = true}: SidepanelItemProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const {status, data} = useEmbed(item)
  const [showDocument, setShowDocument] = useState(false)
  const {data: author} = useAccount(data.document.author, {
    enabled: !!data.document.author,
  })
  const bookmarksService = useBookmarksService()
  const [, setLocation] = useLocation()
  async function onCopy() {
    await copyTextToClipboard(item)
    toast.success('Statement Reference copied successfully', {position: 'top-center'})
  }

  function onGoToPublication(url: string) {
    const [publicationId, version] = getEmbedIds(url)
    setLocation(`/p/${publicationId}/${version}`)
  }

  function toggleDocument(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    console.log(data.document.content)
    setShowDocument((v) => !v)
  }

  if (status == 'loading') {
    return <Box css={{padding: '$5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '$2'}}>...</Box>
  }

  if (status == 'error') {
    return <Text alt css={{display: 'inline-block'}}>{`Error with item id: ${item}`}</Text>
  }

  return (
    <Box
      ref={ref}
      css={{
        position: 'relative',
        marginTop: '$5',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '$2',
        display: 'flex',
        overflow: 'hidden',
        flexDirection: 'column',
        gap: '$4',
        transition: 'all ease-in-out 0.1s',
        backgroundColor: '$background-alt',
      }}
    >
      <Box css={{flex: 1, paddingVertical: '$6', paddingHorizontal: '$4'}}>
        <Editor
          value={showDocument ? data.document.content : [data.statement]}
          mode={showDocument ? EditorMode.Publication : EditorMode.Mention}
        />
      </Box>
      <Box
        css={{
          background: '$background-alt',
          flex: 'none',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          padding: '$4',
          $$gap: '16px',
          display: 'flex',
          gap: '$$gap',
          alignItems: 'center',
          '& *': {
            position: 'relative',
          },
          '& *:not(:first-child):before': {
            content: `"|"`,
            color: '$text-muted',
            opacity: 0.5,
            position: 'absolute',
            left: '-10px',
            top: '50%',
            transform: 'translateY(-50%)',
          },
        }}
      >
        {author && (
          <>
            <Text size="1" color="muted" css={{paddingRight: '$3'}}>
              <span>Signed by </span>
              <span style={{textDecoration: 'underline'}}>{author.profile?.alias}</span>
            </Text>
          </>
        )}
        <Text size="1" color="muted" css={{paddingRight: '$3'}}>
          Created on: {getDateFormat(data.document, 'publishTime')}
        </Text>
      </Box>
      <Dropdown.Root modal={false}>
        <Dropdown.Trigger asChild>
          <ElementDropdown data-trigger>
            <Icon name="MoreHorizontal" size="1" color="muted" />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Content portalled align="start" side="bottom" css={{minWidth: 220}}>
          <Dropdown.Item onSelect={onCopy}>
            <Icon name="Copy" size="1" />
            <Text size="2">Copy Block Reference</Text>
          </Dropdown.Item>
          <Dropdown.Item onSelect={() => onGoToPublication(item)}>
            <Icon name="ArrowTopRight" size="1" />
            <Text size="2">Open in main Panel</Text>
          </Dropdown.Item>
          {remove && (
            <Dropdown.Item onSelect={() => bookmarksService.send({type: 'REMOVE_BOOKMARK', link: item})}>
              <Icon name="Close" size="1" />
              <Text size="2">Remove</Text>
            </Dropdown.Item>
          )}
          <Dropdown.Item onSelect={toggleDocument}>
            <Icon name={showDocument ? 'ArrowDown' : 'ArrowUp'} size="1" />
            <Text size="2">{showDocument ? 'Collapse' : 'Expand'} Document</Text>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </Box>
  )
}

var ElementDropdown = styled('button', {
  border: 'none',
  position: 'absolute',
  right: 4,
  top: 4,
  backgroundColor: '$background-alt',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$2',
  transition: 'all ease-in-out 0.1s',
  '&:hover': {
    cursor: 'pointer',
    backgroundColor: '$background-muted',
  },
})
