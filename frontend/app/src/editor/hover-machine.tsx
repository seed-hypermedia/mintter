import {debug} from '@app/utils/logger'
import {invoke} from '@tauri-apps/api'
import {listen, UnlistenFn} from '@tauri-apps/api/event'
import {getCurrent} from '@tauri-apps/api/window'
import {createMachine} from 'xstate'

export type HoverContext = {
  blockId: string | null
}

type HoverEvent =
  | {type: 'MOUSE_ENTER'; blockId: string}
  | {type: 'MOUSE_LEAVE'}
  | {type: 'FROM_WINDOWS'; blockId?: string}

export const hoverMachine = createMachine(
  {
    tsTypes: {} as import('./hover-machine.typegen').Typegen0,
    schema: {
      events: {} as HoverEvent,
    },
    invoke: {
      id: 'windowHoverListener',
      src: 'windowHoverListener',
    },
    id: 'hover-machine',
    initial: 'ready',
    states: {
      ready: {
        on: {
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
            debug(
              'block_hover LISTENER!!',
              getCurrent().label,
              JSON.stringify(event, null, 3),
            )
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
    },
  },
)
