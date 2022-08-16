import {invoke} from '@tauri-apps/api'
import {listen, UnlistenFn} from '@tauri-apps/api/event'
import {createMachine} from 'xstate'

export type HoverContext = {
  blockId: string | null
}

type HoverEvent =
  | {type: 'MOUSE_ENTER'; blockId: string}
  | {type: 'MOUSE_LEAVE'; blockId: string}
  | {type: 'FROM_WINDOWS'; blockId: string}
// | {type: 'mousemove'}

export function createHoverService() {
  return createMachine(
    {
      tsTypes: {} as import('./hover-machine.typegen').Typegen0,
      schema: {
        events: {} as HoverEvent,
      },
      invoke: [
        {
          id: 'windowHoverListener',
          src: 'windowHoverListener',
        },
        // {
        //   id: 'windowMouseListener',
        //   src: 'windowMouseListener',
        // },
      ],
      id: 'hover-machine',
      initial: 'idle',
      states: {
        idle: {
          on: {
            // mousemove: 'moving',
            MOUSE_ENTER: {
              actions: ['updateBody', 'emit'],
            },
            MOUSE_LEAVE: {
              actions: ['updateBody', 'emit'],
            },
            FROM_WINDOWS: {
              actions: ['updateBody'],
            },
          },
        },
        // moving: {
        //   always: 'idle',
        // },
      },
    },
    {
      actions: {
        updateBody: (_, event) => {
          var blockId = event.type == 'MOUSE_LEAVE' ? '' : event.blockId
          document.body.dataset.hoverBlock = blockId
        },
        emit: (_, event) => {
          var blockId = event.type == 'MOUSE_LEAVE' ? '' : event.blockId
          invoke('emit_all', {event: 'block_hover', payload: blockId})
        },
      },
      services: {
        windowHoverListener: () => (sendBack) => {
          var unlisten: undefined | UnlistenFn

          bootListener()

          async function bootListener() {
            unlisten = await listen<string>('block_hover', (event) => {
              let blockId = event.payload ?? undefined
              let currentBlockId = document.body.dataset.hoverBlock
              if (blockId != currentBlockId) {
                sendBack({type: 'FROM_WINDOWS', blockId})
              }
            })
          }

          return () => {
            unlisten?.()
          }
        },
        // windowMouseListener: () => (sendBack) => {
        //   function onMouseMove() {
        //     sendBack('mousemove')
        //   }

        //   document.body.addEventListener('mousemove', onMouseMove)

        //   return () => {
        //     document.body.removeEventListener('mousemove', onMouseMove)
        //   }
        // },
      },
    },
  )
}
