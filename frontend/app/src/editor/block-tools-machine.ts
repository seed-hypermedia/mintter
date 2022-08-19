import {assign, createMachine} from 'xstate'

type BlockToolsMachineContext = {
  visibleBlocks: Array<
    [key: string, entry: IntersectionObserverEntry['target']]
  >
  currentBounds: Array<[key: string, rect: DOMRect]>
  mouseY: number
  observer?: IntersectionObserver
  currentId?: string
  rootElm: HTMLElement | null
}
export type BlockToolsMachineEvent =
  | {
      type: 'DISABLE'
    }
  | {
      type: 'DROPDOWN.OPEN'
    }
  | {
      type: 'DROPDOWN.CLOSE'
    }
  | {
      type: 'OBSERVER'
      observer: IntersectionObserver
    }
  | {
      type: 'MOUSE.MOVE'
      mouseY: number
    }
  | {
      type: 'ENTRY.OBSERVE'
      entry: HTMLElement
    }
  | {
      type: 'ENTRY.ADD'
      id: string
      entry: IntersectionObserverEntry['target']
    }
  | {
      type: 'ENTRY.DELETE'
      id: string
    }
  | {type: 'WINDOW.BLUR'}

export const blockToolsMachine = createMachine(
  {
    id: 'blockToolsMachine',
    predictableActionArguments: true,
    initial: 'inactive',
    tsTypes: {} as import('./block-tools-machine.typegen').Typegen0,
    schema: {
      events: {} as BlockToolsMachineEvent,
      context: {} as BlockToolsMachineContext,
    },
    context: {
      visibleBlocks: [],
      currentBounds: [],
      mouseY: 0,
      currentId: undefined,
      observer: undefined,
      rootElm: document.querySelector(':root') as HTMLElement,
    },
    invoke: [
      {
        src: 'visibilityObserver',
        id: 'visibilityObserver',
      },
      {
        src: 'windowBlurService',
        id: 'windowBlurService',
      },

      {
        src: 'mouseListener',
        id: 'mouseListener',
      },
    ],
    states: {
      active: {
        entry: ['getBlockBounds', 'assignCurrentId'],
        initial: 'close',
        states: {
          close: {
            on: {
              DISABLE: {
                target: '#blockToolsMachine.inactive',
              },
              'MOUSE.MOVE': {
                actions: [
                  'assignMousePosition',
                  'assignCurrentId',
                  'assignCurrentPosition',
                ],
              },
              'DROPDOWN.OPEN': 'open',
            },
          },
          open: {
            on: {
              'DROPDOWN.CLOSE': 'close',
            },
          },
        },
      },
      inactive: {
        initial: 'idle',
        states: {
          idle: {
            after: {
              '500': {
                // actions: 'assignMousePosition',
                target: '#blockToolsMachine.active.close',
              },
            },
            on: {
              DISABLE: {
                target: 'disabled',
              },
            },
          },
          disabled: {
            always: {
              target: 'idle',
            },
          },
        },
        on: {},
      },
    },
    on: {
      'ENTRY.ADD': {
        actions: 'addEntry',
      },
      'ENTRY.DELETE': {
        actions: 'removeEntry',
      },
      'ENTRY.OBSERVE': {
        actions: 'observeNode',
      },
      OBSERVER: {
        actions: 'assignObserver',
      },

      'WINDOW.BLUR': {
        target: 'inactive',
        actions: ['clearCurrentId', 'resetPosition'],
      },
    },
  },
  {
    services: {
      windowBlurService: () => (sendBack) => {
        function onBlur() {
          sendBack('WINDOW.BLUR')
        }
        window.addEventListener('blur', onBlur)

        return function detachWindowBlurService() {
          window.removeEventListener('blur', onBlur)
        }
      },
      mouseListener: () => (sendBack) => {
        function mouseCallback(event: MouseEvent) {
          sendBack({type: 'MOUSE.MOVE', mouseY: event.clientY})
        }
        window.addEventListener('mousemove', mouseCallback)

        return () => {
          window.removeEventListener('mousemove', mouseCallback)
        }
      },
      visibilityObserver: () => (sendBack) => {
        function callback(entries: Array<IntersectionObserverEntry>) {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              // console.log('IS INTERSECTING!', entry.target.dataset)
              sendBack({
                type: 'ENTRY.ADD',
                id: (entry.target as HTMLElement).dataset.parentBlock,
                entry: entry.target,
              })
            } else {
              // console.log('NOT INTERSECTING!', entry.target.dataset)
              sendBack({
                type: 'ENTRY.DELETE',
                id: (entry.target as HTMLElement).dataset.parentBlock,
              })
            }
          }
        }
        let options = {
          threshold: [0.33, 0.66],
        }
        let observer = new IntersectionObserver(callback, options)
        sendBack({type: 'OBSERVER', observer})

        return () => {
          observer.disconnect()
        }
      },
    },
    actions: {
      addEntry: assign({
        visibleBlocks: (context, event) => {
          let tMap = new Map(context.visibleBlocks)
          tMap.set(event.id, event.entry)
          return [...tMap]
        },
      }),
      removeEntry: assign({
        visibleBlocks: (context, event) => {
          let tMap = new Map(context.visibleBlocks)
          tMap.delete(event.id)
          return [...tMap]
        },
      }),
      observeNode: (context, event) => {
        context.observer?.observe(event.entry)
      },
      getBlockBounds: assign({
        currentBounds: (context) => {
          let newBounds = new Map()
          context.visibleBlocks.forEach(([key, entry]) => {
            newBounds.set(key, entry.getBoundingClientRect())
          })

          return [...newBounds]
        },
      }),
      assignObserver: assign({
        observer: (_, event) => event.observer,
      }),
      assignMousePosition: assign({
        mouseY: (_, event) => {
          return event.mouseY
        },
      }),
      assignCurrentId: assign({
        currentId: (context) => {
          let match = ''

          for (const [key, rect] of context.currentBounds) {
            let top = rect.y
            let bottom = rect.y + rect.height
            if (context.mouseY > top && context.mouseY < bottom) {
              match = key
            }
          }

          return match
        },
      }),
      assignCurrentPosition: (context) => {
        if (context.currentId) {
          let target = `[data-block-id="${context.currentId}"] .blocktools-target`
          let elBlock = document.body.querySelector(target)
          if (elBlock) {
            let rect = elBlock.getBoundingClientRect()
            context.rootElm?.style.setProperty('--tools-x', `${rect.left}`)
            context.rootElm?.style.setProperty('--tools-y', `${rect.top - 40}`)
          }
        }
      },
    },
  },
)
