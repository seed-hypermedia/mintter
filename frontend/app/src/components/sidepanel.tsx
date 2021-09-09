import type {FlowContent} from '@mintter/mttast'
import {isLink} from '@mintter/mttast'
import {isEmbed} from '@mintter/mttast'
import {createContext, useEffect, useContext} from 'react'
import {Box, Text, Button} from '@mintter/ui'
import {useActor, useInterpret, useSelector} from '@xstate/react'
import {createMachine, Interpreter, State} from 'xstate'
// import {usePublication} from '@mintter/client/hooks'
// import {visit} from 'unist-util-visit'
// import {document} from '@mintter/mttast-builder'
import {Editor, Node} from 'slate'
// import {getEmbedIds} from '../editor/elements/embed'
import {InlineEmbed, useEmbed} from '../editor/elements/embed'
import {MINTTER_LINK_PREFIX} from '../constants'
import {visit} from 'unist-util-visit'
import {document} from '@mintter/mttast-builder'
import {assign} from 'xstate'
import {useAccount} from '@mintter/client/hooks'

export type SidepanelEventsType =
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
  | {
      type: 'SIDEPANEL_LOAD_ANNOTATIONS'
      content: Array<FlowContent>
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
export const sidepanelMachine = createMachine(
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
        if ('payload' in event) {
          context.bookmarks.add(event.payload)
        }
      },
      sidepanelRemoveItem: (context: SidepanelContextType, event: SidepanelEventsType) => {
        if ('payload' in event) {
          context.bookmarks.delete(event.payload)
        }
      },
      getAnnotations: assign((_, event: SidepanelEventsType) => {
        let nodes = new Set<string>()
        if ('content' in event) {
          visit(
            document(event.content),
            (n) => isEmbed(n) || (isLink(n) && n.url.includes(MINTTER_LINK_PREFIX)),
            (node) => {
              nodes.add(node.url)
            },
          )
        }
        return {
          annotations: nodes,
        }
      }),
    },
  },
)

export interface SidepanelGlobalContextType {
  service?: Interpreter<SidepanelContextType, any, SidepanelEventsType>
}

export const SidepanelContext = createContext<SidepanelGlobalContextType>({})

export type SidepanelProviderProps = {
  children: React.ReactElement
  machine?: typeof sidepanelMachine
}

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
  }, [])
  return null
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
  const {status, data, error} = useEmbed(item)
  const {data: author} = useAccount(data.document.author, {
    enabled: !!data.document.author,
  })
  const {send} = useSidepanel()

  if (status == 'loading') {
    return <Box css={{padding: '$5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '$2'}}>...</Box>
  }

  if (status == 'error') {
    console.error('SidepanelItem error: ', error)
    return (
      <Box css={{padding: '$4', marginTop: '$5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '$2'}}>
        <Box css={{display: 'flex', gap: '$4'}}>
          <Text size="2" css={{flex: 1}}>{`Error with item id: ${data.statement.id}`}</Text>
          {remove && (
            <Button
              size="1"
              variant="ghost"
              color="primary"
              onClick={() => send({type: 'SIDEPANEL_REMOVE_ITEM', payload: item})}
            >
              remove
            </Button>
          )}
        </Box>
      </Box>
    )
  }

  return (
    <Box
      css={{
        padding: '$4',
        marginTop: '$5',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '$2',
        display: 'flex',
        flexDirection: 'column',
        gap: '$4',
      }}
    >
      <Box css={{display: 'flex', gap: '$4'}}>
        <Text size="2" css={{flex: 1}}>
          <span style={{fontWeight: 'bold'}}>{data?.document?.title}</span> by {author?.profile?.alias}
        </Text>
        {remove && (
          <Button
            size="1"
            variant="ghost"
            color="primary"
            onClick={() => send({type: 'SIDEPANEL_REMOVE_ITEM', payload: item})}
          >
            remove
          </Button>
        )}
      </Box>

      <Text as="span" alt size="2" css={{display: 'inline-block'}}>
        {data.statement.children[0].children.map((child, idx) =>
          isEmbed(child) ? (
            <InlineEmbed key={`${child.url}-${idx}`} embed={child} />
          ) : (
            <span key={`${child.type}-${idx}`}>{Node.string(child)}</span>
          ),
        )}
      </Text>
    </Box>
  )
}
