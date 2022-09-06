import {invoke} from '@tauri-apps/api'
import {listen, UnlistenFn} from '@tauri-apps/api/event'
import {createMachine} from 'xstate'

export type HoverContext = {
  ref: string | null
}

type HoverEvent =
  | {type: 'MOUSE_ENTER'; ref: string}
  | {type: 'MOUSE_LEAVE'; ref: string}
  | {type: 'FROM_WINDOWS'; ref: string}
// | {type: 'mousemove'}

export function createHoverService() {
  return createMachine(
    {
      id: 'hover-machine',
      predictableActionArguments: true,
      tsTypes: {} as import('./hover-machine.typegen').Typegen0,
      schema: {
        events: {} as HoverEvent,
      },
      initial: 'idle',
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
          var ref = event.type == 'MOUSE_LEAVE' ? undefined : event.ref
          if (ref) {
            document.body.dataset.hoverRef = ref
          } else {
            document.body.removeAttribute('data-hover-ref')
          }
        },
        emit: (_, event) => {
          var ref = event.type == 'MOUSE_LEAVE' ? undefined : event.ref

          invoke('emit_all', {event: 'hover_ref', payload: ref})
        },
      },
      services: {
        windowHoverListener: () => (sendBack) => {
          var unlisten: undefined | UnlistenFn

          bootListener()

          async function bootListener() {
            unlisten = await listen<string>('hover_ref', (event) => {
              let ref = event.payload ?? undefined
              let currentRef = document.body.dataset.hoverRef
              if (ref != currentRef) {
                sendBack({type: 'FROM_WINDOWS', ref})
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
