import {useAccount} from '@mintter/client/hooks'
import {isEmbed, isLink} from '@mintter/mttast'
import {document} from '@mintter/mttast-builder'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {useActor, useInterpret, useSelector} from '@xstate/react'
import {createContext, PropsWithChildren, useContext, useEffect, useRef, useState} from 'react'
import toast from 'react-hot-toast'
import {visit} from 'unist-util-visit'
import {useLocation} from 'wouter'
import {assign, createMachine, Interpreter, State} from 'xstate'
import {MINTTER_LINK_PREFIX} from '../constants'
import {Editor} from '../editor'
import {ContextMenu} from '../editor/context-menu'
import {getEmbedIds, useEmbed} from '../editor/embed'
import {EditorMode} from '../editor/plugin-utils'
import {copyTextToClipboard} from '../editor/statement'
import {getDateFormat} from '../utils/get-format-date'
import {Avatar} from './avatar'

export type SidepanelEventsType =
  | {
      type: 'SIDEPANEL_LOAD_ANNOTATIONS'
      // @ts-ignore
      payload: any
    }
  | {
      type: 'SIDEPANEL_ADD_ITEM'
      payload: string
    }
  | {
      type: 'SIDEPANEL_REMOVE_ITEM'
      payload: string
    }
  | {
      type: 'SIDEPANEL_ENABLE'
    }
  | {
      type: 'SIDEPANEL_DISABLE'
    }
  | {
      type: 'SIDEPANEL_OPEN'
    }
  | {
      type: 'SIDEPANEL_TOGGLE'
    }

export type SidepanelContextType = {
  annotations: Set<string>
  bookmarks: Set<string>
}

/*
 * @todo Load annotations in the sidepanel.
 * @body maybe what we can do is to calculate the information and send it to the machine, or directly set the information inside the machine?
 */

/*
 * @todo add types to services and actions
 * @body Issue Body
 */
export const sidepanelMachine = createMachine<SidepanelContextType, SidepanelEventsType>(
  {
    id: 'sidepanel',
    initial: 'disabled',
    context: {
      annotations: new Set<string>(),
      bookmarks: new Set<string>(),
    },
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
            actions: 'sidepanelAddItem',
            target: '.opened',
          },
          SIDEPANEL_REMOVE_ITEM: {
            actions: 'sidepanelRemoveItem',
          },
          SIDEPANEL_LOAD_ANNOTATIONS: {
            actions: ['getAnnotations'],
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
  },
  {
    actions: {
      sidepanelAddItem: (context: SidepanelContextType, event: SidepanelEventsType) => {
        if (event.type != 'SIDEPANEL_ADD_ITEM') return
        context.bookmarks.add(event.payload)
      },
      sidepanelRemoveItem: (context: SidepanelContextType, event: SidepanelEventsType) => {
        if (event.type != 'SIDEPANEL_REMOVE_ITEM') return
        context.bookmarks.delete(event.payload)
      },
      getAnnotations: assign({
        annotations: (_, event) => {
          // if (event.type != 'SIDEPANEL_LOAD_ANNOTATIONS') return
          let nodes = new Set<string>()
          if (event.type == 'SIDEPANEL_LOAD_ANNOTATIONS') {
            visit(
              document(event.payload),
              (n) => isEmbed(n) || (isLink(n) && n.url.includes(MINTTER_LINK_PREFIX)),
              (node) => {
                if ('url' in node) {
                  nodes.add(node.url)
                }
              },
            )
          }

          return nodes
        },
      }),
    },
  },
)

export interface SidepanelGlobalContextType {
  /* eslint-disable */
  service?: Interpreter<SidepanelContextType, any, SidepanelEventsType>
}

export const SidepanelContext = createContext<SidepanelGlobalContextType>({})

export type SidepanelProviderProps = PropsWithChildren<{
  machine?: typeof sidepanelMachine
}>

export function SidepanelProvider({children, machine = sidepanelMachine}: SidepanelProviderProps) {
  const service = useInterpret(machine)

  return <SidepanelContext.Provider value={{service}}>{children}</SidepanelContext.Provider>
}

export function isOpenSelector(state: State<SidepanelContextType>) {
  return state.matches('enabled.opened')
}

export function sidepanelItems(state: State<SidepanelContextType>) {
  return state.context.bookmarks
}

export function useSidepanel() {
  const {service} = useContext(SidepanelContext)

  if (!service) {
    throw new Error(`"useSidepanel" must be called within a "<SidepanelProvider />" component`)
  }
  const {send} = service
  const isOpen = useSelector(service, isOpenSelector)
  const [state] = useActor(service)
  return {
    isOpen,
    send,
    bookmarks: state.context.bookmarks,
    annotations: state.context.annotations,
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

export function Sidepanel({gridArea}: SidepanelProps) {
  const {bookmarks, annotations} = useSidepanel()

  return (
    <Box
      css={{
        top: 0,
        gridArea,
        zIndex: 1,
        borderLeft: '1px solid rgba(0,0,0,0.1)',
      }}
    >
      {Array.from(annotations).length ? (
        <Box
          css={{
            padding: '$5',
          }}
        >
          <Text fontWeight="bold">Annotations</Text>
          {Array.from(annotations).map((item) => {
            return <SidepanelItem key={item} item={item} remove={false} />
          })}
        </Box>
      ) : null}

      {Array.from(bookmarks).length ? (
        <Box
          css={{
            padding: '$5',
          }}
        >
          <Text fontWeight="bold">Bookmarks</Text>
          {Array.from(bookmarks).map((item) => {
            return <SidepanelItem key={item} item={item} />
          })}
        </Box>
      ) : null}
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
  // const {send: sendHover, embed: embedHover} = useHoverEvent(ref, item)
  // console.log({embedHover})
  async function onCopy() {
    await copyTextToClipboard(item)
    toast.success('Statement Reference copied successfully', {position: 'top-center'})
  }

  function onGoToPublication(url: string) {
    const [publicationId] = getEmbedIds(url)
    setLocation(`/p/${publicationId}`)
  }

  function toggleDocument(e) {
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
            // backgroundColor: embedHover == item ? '$secondary-softer' : '$background-alt',
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
                  onClick={() => send({type: 'SIDEPANEL_REMOVE_ITEM', payload: item})}
                >
                  remove
                </Button>
              </>
            )}
          </Box>
          <Editor
            value={showDocument ? data.document.content : [data.statement]}
            mode={showDocument ? EditorMode.Publication : EditorMode.Mention}
          />
        </Box>
      </ContextMenu.Trigger>
      <ContextMenu.Content alignOffset={-5}>
        <ContextMenu.Item onSelect={onCopy}>
          <Icon name="Copy" size="1" />
          <Text size="2">Copy Statement Reference</Text>
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={() => onGoToPublication(item)}>
          <Icon name="ArrowTopRight" size="1" />
          <Text size="2">Open in main Panel</Text>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}
