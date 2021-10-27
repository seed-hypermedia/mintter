import {isEmbed, isLink} from '@mintter/mttast'
import {document} from '@mintter/mttast-builder'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {useActor, useInterpret, useSelector} from '@xstate/react'
import {createContext, MouseEvent, PropsWithChildren, useContext, useEffect, useRef, useState} from 'react'
import toast from 'react-hot-toast'
import {visit} from 'unist-util-visit'
import {useLocation} from 'wouter'
import {InterpreterFrom, StateFrom} from 'xstate'
import {createModel} from 'xstate/lib/model'
import {MINTTER_LINK_PREFIX} from '../constants'
import {Editor} from '../editor'
import {ContextMenu} from '../editor/context-menu'
import {getEmbedIds, useEmbed} from '../editor/embed'
import {EditorMode} from '../editor/plugin-utils'
import {copyTextToClipboard} from '../editor/statement'
import {useAccount} from '../hooks'
import {getDateFormat} from '../utils/get-format-date'
import {Avatar} from './avatar'
import {ScrollArea} from './scroll-area'

export const sidepanelModel = createModel(
  {
    annotations: [] as Array<string>,
    bookmarks: [] as Array<string>,
  },
  {
    events: {
      SIDEPANEL_LOAD_ANNOTATIONS: (document: any) => ({document}),
      SIDEPANEL_ADD_ITEM: (item: string) => ({item}),
      SIDEPANEL_REMOVE_ITEM: (item: string) => ({item}),
      SIDEPANEL_ENABLE: () => ({}),
      SIDEPANEL_DISABLE: () => ({}),
      SIDEPANEL_OPEN: () => ({}),
      SIDEPANEL_TOGGLE: () => ({}),
    },
  },
)

/*
 * @todo add types to services and actions
 * @body Issue Body
 */
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
    },
    enabled: {
      id: 'enabled',
      on: {
        SIDEPANEL_DISABLE: {
          target: 'disabled',
        },
        SIDEPANEL_ADD_ITEM: {
          actions: sidepanelModel.assign({
            bookmarks: (context, event) => [...new Set([...context.bookmarks, event.item])],
          }),
          target: '.opened',
        },
        SIDEPANEL_REMOVE_ITEM: {
          actions: sidepanelModel.assign({
            bookmarks: (context, event) => [
              ...context.bookmarks.slice(0, context.bookmarks.indexOf(event.item)),
              ...context.bookmarks.slice(context.bookmarks.indexOf(event.item) + 1),
            ],
          }),
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

export const SidepanelContext = createContext<{service?: InterpreterFrom<typeof sidepanelMachine>}>({})

export type SidepanelProviderProps = PropsWithChildren<{
  machine?: typeof sidepanelMachine
}>

export function SidepanelProvider({children, machine = sidepanelMachine}: SidepanelProviderProps) {
  const service = useInterpret(machine)

  return <SidepanelContext.Provider value={{service}}>{children}</SidepanelContext.Provider>
}

export function isOpenSelector(state: StateFrom<typeof sidepanelMachine>) {
  return state.matches('enabled.opened')
}

export function sidepanelBookmarks(state: StateFrom<typeof sidepanelMachine>) {
  return state.context.bookmarks
}

export function sidepanelAnnotations(state: StateFrom<typeof sidepanelMachine>) {
  return state.context.annotations
}

export function useSidepanel() {
  const {service} = useContext(SidepanelContext)

  if (!service) {
    throw new Error(`"useSidepanel" must be called within a "<SidepanelProvider />" component`)
  }
  const {send} = service
  const isOpen = useSelector(service, isOpenSelector)
  const bookmarks = useSelector(service, sidepanelBookmarks)
  const annotations = useSelector(service, sidepanelAnnotations)
  const [state] = useActor(service)

  return {
    state,
    isOpen,
    send,
    bookmarks,
    annotations,
  }
}

export function useEnableSidepanel() {
  const {send} = useSidepanel()
  useEffect(() => {
    send('SIDEPANEL_ENABLE')

    return () => {
      send('SIDEPANEL_DISABLE')
    }
  }, [send])
}

export type SidepanelProps = {
  gridArea: string
}

export function Sidepanel() {
  const {bookmarks, annotations, isOpen} = useSidepanel()

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
              return <SidepanelItem key={item} item={item} remove={false} />
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
            {bookmarks.map((item) => {
              return <SidepanelItem key={item} item={item} />
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
  const {send} = useSidepanel()
  const [, setLocation] = useLocation()
  async function onCopy() {
    await copyTextToClipboard(item)
    toast.success('Statement Reference copied successfully', {position: 'top-center'})
  }

  function onGoToPublication(url: string) {
    const [publicationId] = getEmbedIds(url)
    setLocation(`/p/${publicationId}`)
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

  /*
   * @todo refactor statement context menu
   * @body this context menu code is repeated in many components now, we need a wrapper
   */
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Box
          ref={ref}
          css={{
            padding: '$4',
            marginTop: '$5',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '$2',
            display: 'flex',
            flexDirection: 'column',
            gap: '$4',
            transition: 'all ease-in-out 0.1s',
          }}
        >
          <Box css={{display: 'flex', gap: '$4', alignItems: 'center'}}>
            <Box css={{display: 'flex', alignItems: 'center', gap: '$3'}}>
              <Avatar size="1" />
              <Text size="1">{author?.profile?.alias}</Text>
            </Box>
            <Text size="1" color="muted">
              |
            </Text>
            <Text size="1" color="muted">
              {getDateFormat(data.document, 'publishTime')}
            </Text>
            <Text size="1" color="muted">
              |
            </Text>
            <Button size="1" color="primary" variant="ghost" onClick={toggleDocument}>
              {showDocument ? 'Collapse' : 'Expand'} Document
            </Button>
            {remove && (
              <>
                <Text size="1" color="muted">
                  |
                </Text>
                <Button
                  size="1"
                  variant="ghost"
                  color="primary"
                  onClick={() => send({type: 'SIDEPANEL_REMOVE_ITEM', item})}
                >
                  remove
                </Button>
              </>
            )}
          </Box>
          <Text size="4" fontWeight="bold">
            {data.document.title}
          </Text>
          <Editor
            value={showDocument ? data.document.content : [data.statement]}
            mode={showDocument ? EditorMode.Publication : EditorMode.Mention}
          />
        </Box>
      </ContextMenu.Trigger>
      <ContextMenu.Content alignOffset={-5}>
        <ContextMenu.Item onSelect={onCopy}>
          <Icon name="Copy" size="1" />
          <Text size="2">Copy Block Reference</Text>
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={() => onGoToPublication(item)}>
          <Icon name="ArrowTopRight" size="1" />
          <Text size="2">Open in main Panel</Text>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}
