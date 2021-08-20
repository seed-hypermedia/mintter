import {createContext, useEffect, useContext} from 'react'
import {Box, Text, Button} from '@mintter/ui'
import {useMachine} from '@xstate/react'

import {assign, createMachine} from 'xstate'
import {usePublication} from '@mintter/client/hooks'
/** 
 * @todo remove usage of Block
 * @body Block doesn't exist anymore right? We should remove it's usage and make sure everything still works @horacioh
 * */
import type {Block} from 'frontend/client/.generated/documents/v1alpha/documents'

interface SidepanelStateSchema {
  states: {
    disabled: {}
    enabled: {
      states: {
        closed: {}
        opened: {}
        hist: {}
      }
    }
  }
}

export type SidepanelEventsType =
  | {
      type: 'SIDEPANEL_ENABLE'
    }
  | {
      type: 'SIDEPANEL_DISABLE'
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
      type: 'SIDEPANEL_OPEN'
    }
  | {
      type: 'SIDEPANEL_TOGGLE'
    }

export type SidepanelContextType = {
  items: Set<string>
}

export type SidepanelMachineResult = ReturnType<typeof createSidepanelMachine>

export function createSidepanelMachine({services, actions}) {
  return createMachine<SidepanelContextType, SidepanelStateSchema, SidepanelEventsType>(
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
                SIDEPANEL_CLOSE: {
                  target: 'closed',
                },
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
      services,
      actions,
    },
  )
}

export const SidepanelContext = createContext()

export function SidepanelProvider({children}) {
  const machine = useMachine(
    createSidepanelMachine({
      actions: {
        sidepanelAddItem: assign((context: SidepanelContextType, event: SidepanelEventsType) =>
          context.items.add(event.payload),
        ),
        sidepanelRemoveItem: assign((context: SidepanelContextType, event: SidepanelEventsType) => {
          console.log('remove, ', {items: [...context.items], event})
          return context.items.delete(event.payload)
        }),
      },
    }),
  )

  return <SidepanelContext.Provider value={machine}>{children}</SidepanelContext.Provider>
}

export function useSidepanel(): SidepanelMachineResult {
  const machine = useContext(SidepanelContext)

  if (!machine) {
    throw new Error(`"useSidepanel" must be called within a "<SidepanelProvider />" component`)
  }

  return machine
}

export function useEnableSidepanel(send) {
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
  const [state, send] = useSidepanel()

  return (
    <Box
      css={{
        top: 0,
        gridArea,
        padding: '$5',
        borderLeft: '1px solid rgba(0,0,0,0.1)',
      }}
    >
      {[...state.context.items].map((item) => {
        return <SidepanelItem item={item} send={send} />
      })}
    </Box>
  )
}

export type SidepanelItemProps = {
  item: string
  send: any // TODO
}

export function SidepanelItem({item, send}: SidepanelItemProps) {
  const [publicationId, blockId] = item.split('/')
  const {status, data, error} = usePublication(publicationId)

  if (status == 'loading') {
    return <Box css={{padding: '$5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '$2'}}>...</Box>
  }

  if (status == 'error') {
    console.error('SidepanelItem error: ', error)
    return (
      <Box
        css={{padding: '$5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '$2'}}
      >{`Error with item id: ${publicationId}`}</Box>
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
      <PinnedBlock block={data?.document?.blocks[blockId]} />
    </Box>
  )
}

function PinnedBlock({block}: {block: Block}) {
  // TODO: render content as a mini editor
  return (
    <Box css={{backgroundColor: '$secondary-muted', padding: '$4', borderRadius: '$2', marginTop: '$3'}}>
      <Text alt>{block.elements.map((item) => item.textRun?.text).join('')}</Text>
    </Box>
  )
}
