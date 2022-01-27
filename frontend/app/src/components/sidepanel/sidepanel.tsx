import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {Editor} from '@app/editor/editor'
import {getEmbedIds, useEmbed} from '@app/editor/embed'
import {EditorMode} from '@app/editor/plugin-utils'
import {useAccount} from '@app/hooks'
import {createStore} from '@app/store'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {getDateFormat} from '@app/utils/get-format-date'
import {bookmarksModel, useBookmarksService} from '@components/bookmarks'
import {useSidepanel} from '@components/sidepanel'
import {useActor} from '@xstate/react'
import {useRef, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import toast from 'react-hot-toast'
import {useLocation} from 'wouter'
import {createModel} from 'xstate/lib/model'
import {Box} from '../box'
import {Icon} from '../icon'
import {ScrollArea} from '../scroll-area'
import {Text} from '../text'
import {useIsSidepanelOpen} from './sidepanel-context'

const store = createStore('.sidepanel.dat')

export const sidepanelModel = createModel(
  {
    items: [] as Array<string>,
    errorMessage: '',
  },
  {
    events: {
      RETRY: () => ({}),
      'REPORT.SIDEPANEL.GET.SUCCESS': (items: Array<string>) => ({items}),
      'REPORT.SIDEPANEL.GET.ERROR': (errorMessage: Error['message']) => ({errorMessage}),
      'SIDEPANEL.OPEN': () => ({}),
      'SIDEPANEL.TOGGLE': () => ({}),
      'SIDEPANEL.CLOSE': () => ({}),
      'SIDEPANEL.ADD': (item: string) => ({item}),
      'SIDEPANEL.REMOVE': (item: string) => ({item}),
      'SIDEPANEL.CLEAR': () => ({}),
    },
  },
)

export const sidepanelMachine = sidepanelModel.createMachine(
  {
    id: 'Sidepanel',
    initial: 'idle',
    states: {
      idle: {
        invoke: {
          id: 'fetchSidepanel',
          src: () => (sendBack) => {
            store
              .get<Array<string>>('sidepanel')
              .then((result) => {
                console.log('sidepanel store: ', result)

                sendBack(sidepanelModel.events['REPORT.SIDEPANEL.GET.SUCCESS'](result || []))
              })
              .catch((e: Error) => {
                sendBack(sidepanelModel.events['REPORT.SIDEPANEL.GET.ERROR'](`SidepanelFetch Error: ${e.message}`))
              })
          },
        },
        on: {
          'REPORT.SIDEPANEL.GET.ERROR': {
            target: 'errored',
            actions: [
              sidepanelModel.assign({
                errorMessage: (_, event) => event.errorMessage,
              }),
            ],
          },
          'REPORT.SIDEPANEL.GET.SUCCESS': {
            target: 'ready',
            actions: [
              sidepanelModel.assign({
                items: (_, event) => event.items,
              }),
            ],
          },
        },
      },
      errored: {
        on: {
          RETRY: 'idle',
        },
      },
      ready: {
        initial: 'closed',
        states: {
          closed: {
            on: {
              'SIDEPANEL.OPEN': {
                target: 'opened',
              },
              'SIDEPANEL.TOGGLE': {
                target: 'opened',
              },
            },
          },
          opened: {
            on: {
              'SIDEPANEL.CLOSE': {
                target: 'closed',
              },
              'SIDEPANEL.TOGGLE': {
                target: 'closed',
              },
            },
          },
        },
        on: {
          'SIDEPANEL.ADD': {
            actions: [
              sidepanelModel.assign({
                items: (context, event) => {
                  let isIncluded = context.items.filter((current) => current == event.item)

                  if (isIncluded.length) return context.items

                  return [...context.items, event.item]
                },
              }),
              'persist',
            ],
          },
          'SIDEPANEL.REMOVE': {
            actions: [
              sidepanelModel.assign({
                items: (context, event) => context.items.filter((current) => current != event.item),
              }),
              'persist',
            ],
          },
        },
      },
    },
  },
  {
    actions: {
      persist: (ctx) => {
        try {
          store.set('sidepanel', ctx.items)
        } catch (e) {
          console.error(e)
        }
      },
    },
  },
)

export type SidepanelProps = {
  gridArea: string
}

export function Sidepanel() {
  const isOpen = useIsSidepanelOpen()
  const service = useSidepanel()
  const [state, send] = useActor(service)
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
        {state.context.items.length ? (
          <Box
            css={{
              padding: '$5',
            }}
          >
            {state.context.items.map((item) => {
              return (
                <ErrorBoundary key={item} fallback={<span>sidepanel item fallback</span>}>
                  <SidepanelItem key={item} item={item} remove={false} />
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

export function SidepanelItem({item}: SidepanelItemProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const {status, data} = useEmbed(item)
  const bookmarksService = useBookmarksService()
  const [showDocument, setShowDocument] = useState(false)
  const {data: author} = useAccount(data.document.author, {
    enabled: !!data.document.author,
  })
  const [, setLocation] = useLocation()
  async function onCopy() {
    await copyTextToClipboard(item)
    toast.success('Statement Reference copied successfully', {position: 'top-center'})
  }

  function onGoToPublication(url: string) {
    const [publicationId, version] = getEmbedIds(url)
    setLocation(`/p/${publicationId}/${version}`)
  }

  function toggleDocument(e: Event) {
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
          <ElementDropdown
            data-trigger
            css={{
              position: 'absolute',
              right: 4,
              top: 4,
              backgroundColor: '$background-alt',
              '&:hover': {
                backgroundColor: '$background-muted',
              },
            }}
          >
            <Icon name="MoreHorizontal" size="1" color="muted" />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Content portalled align="start" side="bottom" css={{minWidth: 220}}>
          <Dropdown.Item onSelect={onCopy}>
            <Icon name="Copy" size="1" />
            <Text size="2">Copy Block ID</Text>
          </Dropdown.Item>
          <Dropdown.Item onSelect={() => onGoToPublication(item)}>
            <Icon name="ArrowTopRight" size="1" />
            <Text size="2">Open in main Panel</Text>
          </Dropdown.Item>
          <Dropdown.Item
            onSelect={() => {
              bookmarksService.send(bookmarksModel.events['ADD.BOOKMARK'](item))
            }}
          >
            <Icon size="1" name="ArrowBottomRight" />
            <Text size="2">Add to Bookmarks</Text>
          </Dropdown.Item>
          <Dropdown.Item onSelect={toggleDocument}>
            <Icon name={showDocument ? 'ArrowDown' : 'ArrowUp'} size="1" />
            <Text size="2">{showDocument ? 'Collapse' : 'Expand'} Document</Text>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </Box>
  )
}
