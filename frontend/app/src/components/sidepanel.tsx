import {isEmbed} from '@mintter/mttast'
import {createContext, useEffect, useContext} from 'react'
import {Box, Text, Button} from '@mintter/ui'
import {useActor, useInterpret, useSelector} from '@xstate/react'
import {createMachine, Interpreter, State} from 'xstate'
// import {usePublication} from '@mintter/client/hooks'
// import {visit} from 'unist-util-visit'
// import {document} from '@mintter/mttast-builder'
import {Node} from 'slate'
// import {getEmbedIds} from '../editor/elements/embed'
import {InlineEmbed, useEmbed} from '../editor/elements/embed'

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

export type SidepanelContextType = {
  items: Set<string>
}

/*
 * @todo add types to services and actions
 * @body Issue Body
 */
export const sidepanelMachine = createMachine(
  {
    id: 'sidepanel',
    initial: 'disabled',
    context: {
      items: new Set<string>(),
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
          context.items.add(event.payload)
        }
      },
      sidepanelRemoveItem: (context: SidepanelContextType, event: SidepanelEventsType) => {
        if ('payload' in event) {
          context.items.delete(event.payload)
        }
      },
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
  return state.context.items
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
    items: state.context.items,
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
  const {items} = useSidepanel()
  console.log('🚀 ~ file: sidepanel.tsx ~ line 157 ~ Sidepanel ~ items', items)

  return (
    <Box
      css={{
        top: 0,
        gridArea,
        padding: '$5',
        borderLeft: '1px solid rgba(0,0,0,0.1)',
      }}
    >
      {Array.from(items).map((item) => {
        return <SidepanelItem item={item} />
      })}
    </Box>
  )
}

export type SidepanelItemProps = {
  item: string
}

export function SidepanelItem({item}: SidepanelItemProps) {
  // const [publicationId, blockId] = getEmbedIds(item)
  const {status, data, error} = useEmbed(item)
  const {send} = useSidepanel()

  if (status == 'loading') {
    return <Box css={{padding: '$5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '$2'}}>...</Box>
  }

  if (status == 'error') {
    console.error('SidepanelItem error: ', error)
    return (
      <Box css={{padding: '$4', marginTop: '$5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '$2'}}>
        <Box css={{display: 'flex', gap: '$4'}}>
          <Text size="2" css={{flex: 1}}>{`Error with item id: ${publicationId}`}</Text>
          <Button
            size="1"
            variant="ghost"
            color="primary"
            onClick={() => send({type: 'SIDEPANEL_REMOVE_ITEM', payload: item})}
          >
            remove
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box css={{padding: '$4', marginTop: '$5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '$2'}}>
      <Box css={{display: 'flex', gap: '$4'}}>
        <Text size="2" css={{flex: 1}}>
          <span style={{fontWeight: 'bold'}}>{data?.document?.title}</span> by USER
        </Text>
        <Button
          size="1"
          variant="ghost"
          color="primary"
          onClick={() => send({type: 'SIDEPANEL_REMOVE_ITEM', payload: item})}
        >
          remove
        </Button>
      </Box>
      <Box css={{paddingVertical: '$4', borderRadius: '$2', marginTop: '$3'}}>
        {data.statement.children[0].children.map((child, idx) =>
          isEmbed(child) ? (
            <InlineEmbed key={`${child.url}-${idx}`} embed={child} />
          ) : (
            <span key={`${child.type}-${idx}`}>{Node.string(child)}</span>
          ),
        )}
      </Box>
    </Box>
  )
}

// function PinnedBlock({content, blockId}: {content: [GroupingContent]; blockId: string}) {
//   let block: FlowContent
//   visit(document(content), {id: blockId}, (node) => {
//     block = node
//   })

//   if (block) {
//     return (
//       <Box css={{backgroundColor: '$secondary-muted', padding: '$4', borderRadius: '$2', marginTop: '$3'}}>
//         <Text alt>{Node.string(block.children[0])}</Text>
//       </Box>
//     )
//   }
//   return null
// }
