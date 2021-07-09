import {createContext, useEffect, useContext} from 'react'
import {Box, Text, Button} from '@mintter/ui'
import {useActor, useMachine} from '@xstate/react'
import type {UseMachineOptions} from '@xstate/react/lib/useMachine'

import type {UseMutateFunction} from 'react-query'
import {assign, createMachine, interpret, StateMachine} from 'xstate'
import {useState} from 'react'
import {useAccount, useDocument, usePublication} from '@mintter/client/hooks'
import type {Block} from 'frontend/client/.generated/documents/v1alpha/documents'
import {getAccount} from 'frontend/client/src/accounts'

export function createSidepanelMachine({services, actions}) {
  return createMachine(
    {
      id: 'sidepanel',
      initial: 'disabled',
      context: {
        items: [],
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
        sidepanelAddItem: assign((context, event) => {
          if (context.items.indexOf(event.entryItem) == -1) {
            return {items: [...context.items, event.entryItem]}
          }
        }),
        sidepanelRemoveItem: assign((context, event) => {
          const index = context.items.indexOf(event.entryItem)
          if (index === 0) {
            console.log('index 0!!')
            return {items: [...context.items.slice(1)]}
          }
          return {items: [...context.items.slice(0, index), ...context.items.slice(index + 1)]}
        }),
      },
    }),
  )

  return <SidepanelContext.Provider value={machine}>{children}</SidepanelContext.Provider>
}

export function useSidepanel() {
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
  console.log(state.context.items)
  return (
    <Box
      css={{
        top: 0,
        gridArea,
        padding: '$5',
        borderLeft: '1px solid rgba(0,0,0,0.1)',
      }}
    >
      {state.context.items.map((item) => {
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
          onClick={() => send({type: 'SIDEPANEL_REMOVE_ITEM', entryItem: item})}
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
