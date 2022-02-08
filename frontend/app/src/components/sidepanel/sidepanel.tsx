import {
  Account,
  getAccount,
  getPublication,
  listSidepanel,
  SidepanelItem as SidepanelItemType,
  updateListSidepanel,
} from '@app/client'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {Editor} from '@app/editor/editor'
import {getEmbedIds} from '@app/editor/embed'
import {EditorMode} from '@app/editor/plugin-utils'
import {queryKeys} from '@app/hooks'
import {ClientPublication} from '@app/pages/publication'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {getDateFormat} from '@app/utils/get-format-date'
import {getIdsfromUrl} from '@app/utils/get-ids-from-url'
import {bookmarksModel, useBookmarksService} from '@components/bookmarks'
import {DeleteDialog} from '@components/delete-dialog'
import {useSidepanel} from '@components/sidepanel'
import {FlowContent, GroupingContent} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {PropsWithChildren} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import toast from 'react-hot-toast'
import {QueryClient} from 'react-query'
import {visit} from 'unist-util-visit'
import {useLocation} from 'wouter'
import {ActorRefFrom, spawn} from 'xstate'
import {createModel} from 'xstate/lib/model'
import {Box} from '../box'
import {Icon} from '../icon'
import {ScrollArea} from '../scroll-area'
import {Text} from '../text'
import {useIsSidepanelOpen} from './sidepanel-context'

type SidepanelItemRef = ActorRefFrom<ReturnType<typeof createSidepanelItemMachine>>

export type SidepanelItemWithRef = SidepanelItemType & {
  ref?: ActorRefFrom<ReturnType<typeof createSidepanelItemMachine>>
}

export let sidepanelModel = createModel(
  {
    items: [] as Array<SidepanelItemWithRef>,
    errorMessage: '',
  },
  {
    events: {
      RETRY: () => ({}),
      'REPORT.SIDEPANEL.SUCCESS': (items: Array<SidepanelItem>) => ({items}),
      'REPORT.SIDEPANEL.ERROR': (errorMessage: Error['message']) => ({errorMessage}),
      'SIDEPANEL.OPEN': () => ({}),
      'SIDEPANEL.TOGGLE': () => ({}),
      'SIDEPANEL.CLOSE': () => ({}),
      'SIDEPANEL.ADD': (item: SidepanelItem) => ({item}),
      'SIDEPANEL.REMOVE': (url: string) => ({url}),
      'SIDEPANEL.CLEAR': () => ({}),
    },
  },
)

export function createSidepanelMachine(client: QueryClient) {
  return sidepanelModel.createMachine(
    {
      id: 'Sidepanel',
      initial: 'idle',
      context: sidepanelModel.initialContext,
      states: {
        idle: {
          invoke: {
            id: 'fetchSidepanel',
            src: () => (sendBack) => {
              client
                .fetchQuery([queryKeys.GET_SIDEPANEL_LIST], listSidepanel)
                .then((result) => {
                  sendBack(sidepanelModel.events['REPORT.SIDEPANEL.SUCCESS'](result.items || []))
                })
                .catch((e: Error) => {
                  sendBack(sidepanelModel.events['REPORT.SIDEPANEL.ERROR'](`fetchSidepanel Error: ${e.message}`))
                })
            },
          },
          on: {
            'REPORT.SIDEPANEL.ERROR': {
              target: 'errored',
              actions: [
                sidepanelModel.assign({
                  errorMessage: (_, event) => event.errorMessage,
                }),
              ],
            },
            'REPORT.SIDEPANEL.SUCCESS': {
              target: 'ready',
              actions: [
                sidepanelModel.assign({
                  items: (_, event) => {
                    return event.items.map((item) => ({
                      ...item,
                      ref: spawn(createSidepanelItemMachine(client, item)),
                    }))
                  },
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
                'SIDEPANEL.CLEAR': {
                  actions: [
                    sidepanelModel.assign({
                      items: [],
                    }),
                    'persist',
                  ],
                },
              },
            },
          },
          on: {
            'SIDEPANEL.ADD': {
              actions: [
                sidepanelModel.assign({
                  items: (context, event) => {
                    var isIncluded = context.items.filter((current) => current.url == event.item.url)

                    if (isIncluded.length) {
                      console.log('isIncluded', isIncluded)

                      return context.items
                    }

                    return [
                      {...event.item, ref: spawn(createSidepanelItemMachine(client, event.item))},
                      ...context.items,
                    ]
                  },
                }),
                'persist',
              ],
            },
            'SIDEPANEL.REMOVE': {
              actions: [
                sidepanelModel.assign({
                  items: (context, event) => context.items.filter((current) => current.url != event.url),
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
            updateListSidepanel(
              ctx.items.map(({url, type}) => ({
                url,
                type,
              })),
            )
          } catch (e) {
            console.error(e)
          }
        },
      },
    },
  )
}

type SidepanelProps = {
  copy: (url: string) => Promise<void>
}

export function Sidepanel({copy}: SidepanelProps) {
  const service = useSidepanel()
  const [state, send] = useActor(service)
  const isOpen = useIsSidepanelOpen()

  return (
    <Box
      data-testid="sidepanel-wrapper"
      css={{
        gridArea: 'sidepanel',
        borderLeft: '1px solid rgba(0,0,0,0.1)',
        width: isOpen ? '30vw' : 0,
        overflow: 'scroll',
        position: 'relative',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
      }}
    >
      <button
        onClick={() => {
          send('SIDEPANEL.CLEAR')
        }}
      >
        clear sidepanel
      </button>
      <ScrollArea>
        {state.context.items.length ? (
          <Box
            as="ul"
            data-testid="sidepanel-list"
            css={{
              padding: '$5',
              margin: 0,
            }}
          >
            {state.context.items.map((item) => {
              return (
                <ErrorBoundary key={`${item.type}-${item.url}`} fallback={<li>sidepanel item fallback</li>}>
                  {item.ref ? (
                    <SidepanelItem key={`${item.type}-${item.url}`} itemRef={item.ref} copy={copy} />
                  ) : (
                    <Text>ref is not defined on item</Text>
                  )}
                </ErrorBoundary>
              )
            })}
          </Box>
        ) : null}
      </ScrollArea>
    </Box>
  )
}

export type BlockItemProps = {
  ref: SidepanelItemRef
}

export type SidepanelItemProps = PropsWithChildren<{
  itemRef: SidepanelItemRef
}>

export function SidepanelItem({
  itemRef,
  copy = copyTextToClipboard,
}: {
  itemRef: SidepanelItemRef
  copy?: (url: string) => Promise<unknown>
}) {
  const [state, send] = useActor(itemRef)
  const [, setLocation] = useLocation()
  const bookmarkService = useBookmarksService()
  const sidepanelService = useSidepanel()

  async function localCopy() {
    await copy(state.context.url)
    toast.success('Statement Reference copied successfully', {position: 'top-center'})
  }

  function navigate(url: string) {
    const [publicationId, version] = getEmbedIds(url)
    setLocation(`/p/${publicationId}/${version}`)
  }

  function toggle(e: Event) {
    e.preventDefault()
    send(sidepanelItemModel.events['SIDEPANEL.ITEM.TOGGLE']())
  }

  function bookmark(url: string) {
    bookmarkService.send(bookmarksModel.events['BOOKMARK.ADD'](url))
  }

  function deleteItem(url: string) {
    sidepanelService.send(sidepanelModel.events['SIDEPANEL.REMOVE'](url))
  }

  let isExpanded = state.matches('expanded')

  if (state.matches('loading')) return <span>...</span>

  let dropdown = (
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
      <Dropdown.Content align="start" side="bottom" css={{minWidth: 220}} data-testid="sidepanel-dropdown-content">
        <Dropdown.Item onSelect={localCopy} data-testid="copy-item">
          <Icon name="Copy" size="1" />
          <Text size="2">Copy Block ID</Text>
        </Dropdown.Item>
        <Dropdown.Item onSelect={() => navigate?.(state.context.url)}>
          <Icon name="ArrowTopRight" size="1" />
          <Text size="2">Open in main Panel</Text>
        </Dropdown.Item>
        <Dropdown.Item
          onSelect={() => {
            bookmark?.(state.context.url)
          }}
        >
          <Icon size="1" name="ArrowBottomRight" />
          <Text size="2">Add to Bookmarks</Text>
        </Dropdown.Item>
        <Dropdown.Item onSelect={toggle}>
          <Icon name={isExpanded ? 'ArrowDown' : 'ArrowUp'} size="1" />
          <Text size="2">{isExpanded ? 'Collapse' : 'Expand'} Document</Text>
        </Dropdown.Item>
        <DeleteDialog
          entryId={state.context.url}
          handleDelete={deleteItem}
          title="Delete item"
          description="Are you sure you want to delete this item? This action is not reversible."
          onSuccess={() => toast.success('Sidepanel item deleted successfully')}
        >
          <Dropdown.Item
            onSelect={(e) => {
              e.preventDefault()
            }}
            data-testid="delete-item"
          >
            <Icon name="CloseCircle" size="1" />
            <Text size="2">Delete from sidepanel</Text>
          </Dropdown.Item>
        </DeleteDialog>
      </Dropdown.Content>
    </Dropdown.Root>
  )

  return state.context.type == 'publication' ? (
    <PublicationItem itemRef={itemRef}>{dropdown}</PublicationItem>
  ) : (
    <BlockItem itemRef={itemRef}>{dropdown}</BlockItem>
  )
}

export function PublicationItem({itemRef, children}: SidepanelItemProps) {
  const [state] = useActor(itemRef)
  const isExpanded = state.matches('expanded')

  return (
    <Box
      as="li"
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
      <Box
        css={{
          padding: '$4',
        }}
      >
        <Text size="1" color="muted" data-testid="sidepanel-item-type">
          Publication
        </Text>
      </Box>
      {isExpanded && (
        <Box
          css={{
            flex: 1,
            paddingVertical: '$6',
            paddingHorizontal: '$4',
            [`& [data-element-id="${state.context.block?.id}"] [data-element-type="paragraph"], & [data-element-id="${state.context.block?.id}"] [data-element-type="static-paragraph"]`]:
              {
                backgroundColor: '$secondary-muted',
              },
          }}
        >
          {state.matches('loading') ? null : (
            <Editor
              value={state.context.publication.document.content}
              mode={isExpanded ? EditorMode.Publication : EditorMode.Mention}
              onChange={() => {
                // noop
              }}
            />
          )}
        </Box>
      )}
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
        {state.context.author && (
          <>
            <Text size="1" color="muted" css={{paddingRight: '$3'}}>
              <span>Signed by </span>
              <span style={{textDecoration: 'underline'}}>{state.context.author.profile?.alias}</span>
            </Text>
          </>
        )}
        <Text size="1" color="muted">
          {state.context.publication?.document.title}
        </Text>
        <Text size="1" color="muted" css={{paddingRight: '$3'}}>
          Created on: {getDateFormat(state.context.publication?.document, 'publishTime')}
        </Text>
      </Box>
      {children}
    </Box>
  )
}

export function BlockItem({itemRef, children}: SidepanelItemProps) {
  const [state] = useActor(itemRef)

  const isExpanded = state.matches('expanded')

  return (
    <Box
      as="li"
      data-testid="sidepanel-item"
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
        '&:first-child': {
          marginTop: 0,
        },
      }}
    >
      <Box
        css={{
          padding: '$4',
        }}
      >
        <Text size="1" color="muted" data-testid="sidepanel-item-type">
          Block
        </Text>
      </Box>
      <Box
        css={{
          flex: 1,
          paddingVertical: '$6',
          paddingHorizontal: '$4',
          [`& [data-element-id="${state.context.block?.id}"] > span >  [data-element-type="paragraph"], & [data-element-id="${state.context.block?.id}"] > span > [data-element-type="static-paragraph"]`]:
            {
              backgroundColor: '$secondary-muted',
            },
        }}
      >
        {state.matches('loading') ? null : (
          <Editor
            value={isExpanded ? state.context.publication?.document?.content : [state.context.block]}
            mode={isExpanded ? EditorMode.Publication : EditorMode.Mention}
            onChange={() => {
              // noop
            }}
          />
        )}
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
        {state.context.author && (
          <>
            <Text size="1" color="muted" css={{paddingRight: '$3'}}>
              <span>Signed by </span>
              <span style={{textDecoration: 'underline'}}>{state.context.author.profile?.alias}</span>
            </Text>
          </>
        )}
        <Text size="1" color="muted">
          {state.context.publication?.document.title}
        </Text>
        <Text size="1" color="muted" css={{paddingRight: '$3'}}>
          Created on: {getDateFormat(state.context.publication?.document, 'publishTime')}
        </Text>
      </Box>
      {children}
    </Box>
  )
}

var sidepanelItemModel = createModel(
  {
    type: undefined as 'publication' | 'block' | undefined,
    url: '',
    publication: null as ClientPublication | null,
    block: null as FlowContent | null,
    author: null as Account | null,
    errorMessage: '',
  },
  {
    events: {
      RETRY: () => ({}),
      'SIDEPANEL.ITEM.EXPAND': () => ({}),
      'SIDEPANEL.ITEM.COLLAPSE': () => ({}),
      'SIDEPANEL.ITEM.DELETE': () => ({}),
      'SIDEPANEL.ITEM.TOGGLE': () => ({}),
      'REPORT.SIDEPANEL.ITEM.SUCCESS': (
        publication: ClientPublication,
        author: Account,
        block: FlowContent | null,
      ) => ({
        publication,
        author,
        block,
      }),
      'REPORT.SIDEPANEL.ITEM.ERROR': (errorMessage: Error['message']) => ({errorMessage}),
    },
  },
)

export function createSidepanelItemMachine(client: QueryClient, item: SidepanelItemType) {
  return sidepanelItemModel.createMachine(
    {
      initial: 'loading',
      context: {
        ...sidepanelItemModel.initialContext,
        ...item,
      },
      states: {
        loading: {
          invoke: {
            id: 'fetchItemData',
            src: 'fetchItemData',
          },
          on: {
            'REPORT.SIDEPANEL.ITEM.SUCCESS': [
              {
                target: 'expanded',
                cond: (context) => context.type == 'publication',
                actions: [
                  sidepanelItemModel.assign({
                    publication: (_, event) => event.publication,
                    author: (_, event) => event.author,
                  }),
                ],
              },
              {
                target: 'collapsed',
                actions: [
                  sidepanelItemModel.assign({
                    publication: (_, event) => event.publication,
                    block: (_, event) => event.block,
                    author: (_, event) => event.author,
                  }),
                ],
              },
            ],
            'REPORT.SIDEPANEL.ITEM.ERROR': {
              target: 'errored',
              actions: [
                sidepanelItemModel.assign({
                  errorMessage: (_, event) => event.errorMessage,
                }),
              ],
            },
          },
        },
        errored: {
          on: {
            RETRY: {
              target: 'loading',
              actions: [
                sidepanelItemModel.assign({
                  errorMessage: '',
                }),
              ],
            },
          },
        },
        expanded: {
          on: {
            'SIDEPANEL.ITEM.COLLAPSE': {
              target: 'collapsed',
            },
            'SIDEPANEL.ITEM.TOGGLE': {
              target: 'collapsed',
            },
          },
        },
        collapsed: {
          on: {
            'SIDEPANEL.ITEM.EXPAND': {
              target: 'expanded',
            },
            'SIDEPANEL.ITEM.TOGGLE': {
              target: 'expanded',
            },
          },
        },
      },
    },
    {
      services: {
        fetchItemData: (context) => async (sendBack) => {
          let [documentId, version, blockId] = getIdsfromUrl(context.url)

          let publication: ClientPublication = await client.fetchQuery(
            [queryKeys.GET_PUBLICATION, documentId, version],
            async () => {
              let pub = await getPublication(documentId, version)

              let content: [GroupingContent] = pub.document?.content ? JSON.parse(pub.document?.content) : null

              return {
                ...pub,
                document: {
                  ...pub.document,
                  content,
                },
              }
            },
          )

          let author = await client.fetchQuery([queryKeys.GET_ACCOUNT, publication.document?.author], () =>
            getAccount(publication.document?.author as string),
          )

          let block: FlowContent | null = null

          if (context.type == 'block') {
            if (blockId && publication.document.content) {
              visit(publication.document.content[0], {id: blockId}, (node) => {
                block = node
              })
            }
          }

          sendBack(sidepanelItemModel.events['REPORT.SIDEPANEL.ITEM.SUCCESS'](publication, author, block))
        },
      },
    },
  )
}
