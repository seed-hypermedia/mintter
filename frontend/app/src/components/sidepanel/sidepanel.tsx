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
import {useMainPage} from '@app/main-page-context'
import {ClientPublication} from '@app/pages/publication'
import {css} from '@app/stitches.config'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {getDateFormat} from '@app/utils/get-format-date'
import {getIdsfromUrl} from '@app/utils/get-ids-from-url'
import {error} from '@app/utils/logger'
import {useBookmarksService} from '@components/bookmarks'
import {DeleteDialog, deleteDialogMachine} from '@components/delete-dialog'
import {useSidepanel} from '@components/sidepanel'
import {FlowContent, GroupingContent} from '@mintter/mttast'
import {invoke} from '@tauri-apps/api'
import {useActor, useMachine} from '@xstate/react'
import {PropsWithChildren} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import toast from 'react-hot-toast'
import {QueryClient} from 'react-query'
import {visit} from 'unist-util-visit'
import {ActorRefFrom, assign, createMachine, spawn, StateFrom} from 'xstate'
import {Box} from '../box'
import {Icon} from '../icon'
import {Text} from '../text'
import {useIsSidepanelOpen} from './sidepanel-context'

type SidepanelItemRef = ActorRefFrom<
  ReturnType<typeof createSidepanelItemMachine>
>

export type SidepanelItemWithRef = SidepanelItemType & {
  ref?: ActorRefFrom<ReturnType<typeof createSidepanelItemMachine>>
}

export type SidepanelContextType = {
  items: Array<SidepanelItemWithRef>
  errorMessage: string
}

export type SidepanelEvent =
  | {type: 'RETRY'}
  | {type: 'REPORT.SIDEPANEL.SUCCESS'; items: Array<SidepanelItemWithRef>}
  | {type: 'REPORT.SIDEPANEL.ERROR'; errorMessage: string}
  | {type: 'SIDEPANEL.ADD'; item: SidepanelItemType}
  | {type: 'SIDEPANEL.OPEN'}
  | {type: 'SIDEPANEL.TOGGLE'}
  | {type: 'SIDEPANEL.CLOSE'}
  | {type: 'SIDEPANEL.REMOVE'; url: string}
  | {type: 'SIDEPANEL.CLEAR'}

export function createSidepanelMachine(client: QueryClient) {
  return createMachine(
    {
      tsTypes: {} as import('./sidepanel.typegen').Typegen0,
      schema: {
        context: {} as SidepanelContextType,
        events: {} as SidepanelEvent,
      },
      id: 'Sidepanel',
      initial: 'idle',
      context: {
        items: [],
        errorMessage: '',
      },
      states: {
        idle: {
          invoke: {
            id: 'fetchSidepanel',
            src: () => (sendBack) => {
              client
                .fetchQuery([queryKeys.GET_SIDEPANEL_LIST], listSidepanel)
                .then(({items}) => {
                  sendBack({type: 'REPORT.SIDEPANEL.SUCCESS', items})
                })
                .catch((e: Error) => {
                  sendBack({
                    type: 'REPORT.SIDEPANEL.ERROR',
                    errorMessage: `fetchSidepanel Error: ${e.message}`,
                  })
                })
            },
          },
          on: {
            'REPORT.SIDEPANEL.ERROR': {
              target: 'errored',
              actions: ['assignError'],
            },
            'REPORT.SIDEPANEL.SUCCESS': {
              target: 'ready',
              actions: ['assignSidepanelItems'],
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
                  actions: ['clearItems', 'persist'],
                },
              },
            },
          },
          on: {
            'SIDEPANEL.ADD': {
              actions: ['addItemToSidepanel', 'persist'],
            },
            'SIDEPANEL.REMOVE': {
              actions: ['removeItemFromSidepanel', 'persist'],
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
            error(e)
          }
        },
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        assignSidepanelItems: assign({
          items: (_, event) => {
            return event.items.map((item) => ({
              ...item,
              ref: spawn(createSidepanelItemMachine(client, item)),
            }))
          },
        }),
        clearItems: assign({
          items: () => [],
        }),
        addItemToSidepanel: assign({
          items: (context, event) => {
            var isIncluded = context.items.filter(
              (current) => current.url == event.item.url,
            )

            if (isIncluded.length) {
              return context.items
            }

            return [
              {
                ...event.item,
                ref: spawn(createSidepanelItemMachine(client, event.item)),
              },
              ...context.items,
            ]
          },
        }),
        removeItemFromSidepanel: assign({
          items: (context, event) =>
            context.items.filter((current) => current.url != event.url),
        }),
      },
    },
  )
}

type SidepanelProps = {
  copy?: (url: string) => Promise<unknown>
}

export function Sidepanel({copy = copyTextToClipboard}: SidepanelProps) {
  const service = useSidepanel()
  const [state, send] = useActor(service)
  const isOpen = useIsSidepanelOpen()

  return (
    <Box
      data-testid="sidepanel-wrapper"
      css={{
        gridArea: 'sidepanel',
        borderLeft: '1px solid $colors$menu-shadow',
        width: isOpen ? '30vw' : 0,
        overflow: 'scroll',
        position: 'relative',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
        paddingBottom: 200,
      }}
    >
      <Box
        css={{
          display: 'flex',
          alignItems: 'center',
          gap: '$4',
          paddingHorizontal: '$4',
        }}
      >
        <Box css={{flex: 1, paddingVertical: '$4'}}>
          <Text size="1" color="muted">
            Sidepanel
          </Text>
        </Box>
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <ElementDropdown data-trigger css={{background: 'transparent'}}>
              <Icon name="MoreHorizontal" size="1" color="muted" />
            </ElementDropdown>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.Item
              data-testid="clear-sidepanel"
              onSelect={() => send('SIDEPANEL.CLEAR')}
            >
              <Icon size="1" name="Close" />
              <Text size="2">Clear Items</Text>
            </Dropdown.Item>
            <Dropdown.Item
              data-testid="clear-sidepanel"
              onSelect={() => send('SIDEPANEL.CLOSE')}
            >
              <Icon size="1" name="Close" />
              <Text size="2">Close Sidenapel</Text>
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </Box>

      {state.context.items.length ? (
        <Box
          data-testid="sidepanel-list"
          css={{
            padding: '$4',
            margin: 0,
          }}
        >
          {state.context.items.map((item) => {
            return (
              <ErrorBoundary
                key={`${item.type}-${item.url}`}
                fallback={<li>sidepanel item fallback</li>}
              >
                {item.ref ? (
                  <SidepanelItem
                    key={`${item.type}-${item.url}`}
                    itemRef={item.ref}
                    copy={copy}
                  />
                ) : (
                  <Text>ref is not defined on item</Text>
                )}
              </ErrorBoundary>
            )
          })}
        </Box>
      ) : null}
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
  const mainPageService = useMainPage()
  const bookmarkService = useBookmarksService()
  const sidepanelService = useSidepanel()
  const [deleteState, deleteSend] = useMachine(() => deleteDialogMachine, {
    services: {
      deleteEntry: () =>
        new Promise(() =>
          sidepanelService.send({
            type: 'SIDEPANEL.REMOVE',
            url: state.context.url,
          }),
        ),
    },
    actions: {
      onSuccess: () => toast.success('Sidepanel item deleted successfully'),
    },
  })

  async function localCopy() {
    await copy(state.context.url)
    toast.success('Statement Reference copied successfully', {
      position: 'top-center',
    })
  }

  function navigate(url: string) {
    const [publicationId, version] = getEmbedIds(url)
    mainPageService.send({
      type: 'goToPublication',
      docId: publicationId,
      version,
    })
  }

  function toggle(e: Event) {
    e.preventDefault()
    send({type: 'SIDEPANEL.ITEM.TOGGLE'})
  }

  function bookmark(url: string) {
    bookmarkService.send({
      type: 'BOOKMARK.ADD',
      url,
    })
  }

  async function onOpenInNewWindow() {
    const [publicationId, version] = getEmbedIds(state.context.url)
    await invoke('open_in_new_window', {url: `/p/${publicationId}/${version}`})
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
            backgroundColor: '$base-background-subtle',
            '&:hover': {
              backgroundColor: '$base-component-bg-normal',
            },
          }}
        >
          <Icon name="MoreHorizontal" size="1" color="muted" />
        </ElementDropdown>
      </Dropdown.Trigger>
      <Dropdown.Content
        align="start"
        side="bottom"
        css={{minWidth: 220}}
        data-testid="sidepanel-dropdown-content"
        hidden={deleteState.matches('opened')}
      >
        <Dropdown.Item onSelect={localCopy} data-testid="copy-item">
          <Icon name="Copy" size="1" />
          <Text size="2">Copy Block ID</Text>
        </Dropdown.Item>
        <Dropdown.Item onSelect={() => navigate?.(state.context.url)}>
          <Icon name="ArrowTopRight" size="1" />
          <Text size="2">Open in main Panel</Text>
        </Dropdown.Item>
        <Dropdown.Item onSelect={onOpenInNewWindow}>
          <Icon name="OpenInNewWindow" size="1" />
          <Text size="2">Open in new Window</Text>
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
          state={deleteState}
          send={deleteSend}
          title="Delete item"
          description="Are you sure you want to delete this item? This action is not reversible."
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
        backgroundColor: '$base-background-subtle',
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
            padding: '$4',
            // paddingVertical: '$6',
            // paddingHorizontal: '$4',
            [`& [data-element-id="${state.context.block?.id}"] [data-element-type="paragraph"], & [data-element-id="${state.context.block?.id}"] [data-element-type="static-paragraph"]`]:
              {
                // TODO: highlight blockId element
              },
          }}
        >
          {state.matches('loading') ? null : (
            <Editor
              className={sidepanelItemStyle({
                variant: isExpanded ? 'expanded' : 'collapsed',
              })}
              value={
                (
                  state as StateFrom<
                    ReturnType<typeof createSidepanelItemMachine>
                  >
                ).context?.publication?.document.content
              }
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
          background: '$base-background-subtle',
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
            color: '$base-text-low',
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
              <span style={{textDecoration: 'underline'}}>
                {state.context.author.profile?.alias}
              </span>
            </Text>
          </>
        )}
        <Text size="1" color="muted">
          {state.context.publication?.document.title}
        </Text>
        <Text size="1" color="muted" css={{paddingRight: '$3'}}>
          Created on:{' '}
          {getDateFormat(state.context.publication?.document, 'publishTime')}
        </Text>
      </Box>
      {children}
    </Box>
  )
}

const sidepanelItemStyle = css({
  display: 'inline-block',
  variants: {
    variant: {
      expanded: {
        marginLeft: -30,
      },
      collapsed: {},
    },
  },
})

export function BlockItem({itemRef, children}: SidepanelItemProps) {
  const [state] = useActor(itemRef)

  const isExpanded = state.matches('expanded')

  return (
    <Box
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
        backgroundColor: '$base-background-subtle',
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
          padding: '$4',
          // paddingVertical: '$6',
          // paddingHorizontal: '$4',
          [`& [data-element-id="${state.context.block?.id}"] > span >  [data-element-type="paragraph"], & [data-element-id="${state.context.block?.id}"] > span > [data-element-type="static-paragraph"]`]:
            {
              borderBottomColor: '$base-component-bg-normal',
            },
        }}
      >
        {state.matches('loading') ? null : (
          <Editor
            className={sidepanelItemStyle({
              variant: isExpanded ? 'expanded' : 'collapsed',
            })}
            value={
              isExpanded
                ? state.context.publication?.document?.content
                : [state.context.block]
            }
            mode={isExpanded ? EditorMode.Publication : EditorMode.Mention}
            onChange={() => {
              // noop
            }}
          />
        )}
      </Box>
      <Box
        css={{
          background: '$base-background-subtle',
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
            color: '$base-text-low',
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
              <span style={{textDecoration: 'underline'}}>
                {state.context.author.profile?.alias}
              </span>
            </Text>
          </>
        )}
        <Text size="1" color="muted">
          {state.context.publication?.document.title}
        </Text>
        <Text size="1" color="muted" css={{paddingRight: '$3'}}>
          Created on:{' '}
          {getDateFormat(state.context.publication?.document, 'publishTime')}
        </Text>
      </Box>
      {children}
    </Box>
  )
}

export type SidepanelItemContextType = {
  type: 'publication' | 'block' | undefined
  url: string
  publication: ClientPublication | null
  block: FlowContent | null
  author: Account | null
  errorMessage: string
}

export type SidepanelItemEventType =
  | {type: 'SIDEPANEL.ITEM.EXPAND'}
  | {type: 'SIDEPANEL.ITEM.COLLAPSE'}
  | {type: 'SIDEPANEL.ITEM.DELETE'}
  | {type: 'SIDEPANEL.ITEM.TOGGLE'}
  | {
      type: 'REPORT.SIDEPANEL.ITEM.SUCCESS'
      publication: ClientPublication
      author: Account
      block: FlowContent | null
    }
  | {type: 'REPORT.SIDEPANEL.ITEM.ERROR'; errorMessage: string}
  | {type: 'RETRY'}

export function createSidepanelItemMachine(
  client: QueryClient,
  item: SidepanelItemType,
) {
  return createMachine(
    {
      tsTypes: {} as import('./sidepanel.typegen').Typegen1,
      schema: {
        context: {} as SidepanelItemContextType,
        events: {} as SidepanelItemEventType,
      },
      initial: 'loading',
      context: {
        type: item.type,
        url: item.url,
        publication: null,
        block: null,
        author: null,
        errorMessage: '',
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
                actions: ['assignPublication', 'assignAuthor'],
              },
              {
                target: 'collapsed',
                actions: ['assignPublication', 'assignAuthor', 'assignBlock'],
              },
            ],
            'REPORT.SIDEPANEL.ITEM.ERROR': {
              target: 'errored',
              actions: ['assignError'],
            },
          },
        },
        errored: {
          on: {
            RETRY: {
              target: 'loading',
              actions: ['clearError'],
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

              let content: [GroupingContent] = pub.document?.content
                ? JSON.parse(pub.document?.content)
                : null

              return {
                ...pub,
                document: {
                  ...pub.document,
                  content,
                },
              }
            },
          )

          let author = await client.fetchQuery(
            [queryKeys.GET_ACCOUNT, publication.document?.author],
            () => getAccount(publication.document?.author as string),
          )

          let block: FlowContent | null = null

          if (context.type == 'block') {
            if (blockId && publication.document.content) {
              visit(publication.document.content[0], {id: blockId}, (node) => {
                block = node
              })
            }
          }

          sendBack({
            type: 'REPORT.SIDEPANEL.ITEM.SUCCESS',
            publication,
            author,
            block,
          })
        },
      },
      actions: {
        assignAuthor: assign({
          author: (_, event) => event.author,
        }),
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        assignBlock: assign({
          block: (_, event) => event.block,
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        clearError: assign({
          errorMessage: (c) => '',
        }),
      },
    },
  )
}
