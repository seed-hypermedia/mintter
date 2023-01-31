import {invoke} from '@tauri-apps/api'
import {listen, UnlistenFn} from '@tauri-apps/api/event'
import {assign, createMachine} from 'xstate'

type VisibleBlock = [blockId: string, ref: HTMLElement]
type Bound = [id: string, rect: DOMRect]

type MouseEvent =
  | {type: 'BLOCK.ADD'; blockId: string; entry: HTMLElement}
  | {type: 'BLOCK.REMOVE'; blockId: string}
  | {type: 'BLOCK.OBSERVE'; entry: HTMLElement}
  | {type: 'DISABLE.WINDOW.BLUR'}
  | {type: 'DISABLE.WINDOW.RESIZE'}
  | {type: 'MOUSE.MOVE'; position: number}
  | {type: 'DISABLE.CHANGE'}
  | {type: 'DISABLE.BLOCKTOOLS.OPEN'}
  | {type: 'DISABLE.BLOCKTOOLS.CLOSE'}
  | {type: 'DISABLE.SCROLL'}
  | {type: 'INIT.OBSERVER'; observer: IntersectionObserver}
  | {type: 'HIGHLIGHT.ENTER'; ref: string}
  | {type: 'HIGHLIGHT.LEAVE'}
  | {type: 'HIGHLIGHT.FROM.WINDOWS'; ref: string}

type MouseContext = {
  visibleBounds: Array<Bound>
  observer?: IntersectionObserver
  visibleBlocks: Array<VisibleBlock>
  currentBound?: Bound
  highlightRef: string
}

export var mouseMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QFsD2BXWYC0yCGAxgBYCWAdmAMQCSActQCoB0A8gEIDKAogEoBqvANoAGALqJQAB1SwSAFxKoyEkAA9EAdgCsWpgBYAnACYAHAGYtBy2b0m9AGhABPRAEYjAXw+O0mHPmJyKjYAGRYAYQBpJgBBABE4kXEkEGlZBSUVdQRtXW0zIy0NADYDM1LzRxcEV2ETJiNCwr1XC2KtVtcvHwwsXEJSCkpQiOieLgBZFgEklTT5RWUU7I09XWLDYTKzYTWDdqrEAo19Vz1hVwNtEw0Sg26QXz6AweCwqNZOXhmxOZkFzLLTSGfRbIyuLSGIzFXYGQ41EzFYr6EyFYoaExaGGuDQPJ7+AZBShxagcGKhLhMADqdDiLCpTFCAFUeLMUvMMktQNlXLz6sINMIzAYRec9Md4SZXMicVijCUdjstGY8b0CYEhiSyRTqbT6UxxhxqAAtLhsqT-TlZTTKphYtatYwYxqS6VMWXFeXFRXCZWqvz9DVUAAS1AA4sGQuHg8wuLQGEJfuzLYtrTlxXbShc6rz9lojPCjLt9FpfXV5a1hNDPN5HmrA69KKGI1GI8wQlwYj9khb0qmgTVecjLEWzKjDAZpfDXDcjPoDCZ9qZDFpMf7noShs3I9HmAAxHgsCa62h0qkcc2pFOA7lHcFMXa1GGC6Uw4TFaeT4QPwwmTE2OpV1xWt8QbIImEIBQADcwCYWA5FQSRJEgYlSXJDtGXeSIGBYFgQg4JhwjCbhLw5ftbwQfMTgXKwTAFEUNBdZw3GVAwGjsc4NF5X1lWAnoAxecDIJIGCmAAJzAPAICcSgpiZbgmCmbs-j7G81DcApp0MaiNH2Oi9CLRF5XXdVXggghoNgiSpJkuSFKUs1XB7K9VK5dSEVcO0Z0aAwyyuMxWi0vQTk2XlWjMDQzAKYoTLAihzMs8TJOk1DtQw8JgxiWgwzNJNewBNyeSffQ9G9bQizKydpwKXQBR0VcbkYgo9FiwT4uE0TrJSrV0MpDhwkPEIQlI69CsQUUmBhdEjFKnQpRnadLmRHZzgXDYYRmlqQPrNrYI6qzkpknqdRGKIcLwgiWAABTjEbXLTNY5y4xFyvcf90WnSKzCYScDIFYoblKowVW2gTN1g8h9tklh5MpBy7oKtMrmnd9h1uCKdF+iKvFrMhUAgOAVFA3aVMRgdynhUtvsadwthKEo5Ri0GNyDBKRLAUmrQHOxFsXB95T-PQhdFUrWvBtnRPgxDkIgTnyPcqU51KwHMRaeVSundoTlfJUooipEQf4lmzP2pKbLltTsnlOctZ0YGkX2b0HGYmp2m-ItakKW40S6ZnTPAyGLPZi2xpqCxPJ0AU6LOYpajqFGdjtcxGnlY4NhrLwgA */
  createMachine(
    {
      context: {visibleBounds: [], visibleBlocks: [], highlightRef: ''},
      tsTypes: {} as import('./mouse-machine.typegen').Typegen0,
      schema: {context: {} as MouseContext, events: {} as MouseEvent},
      predictableActionArguments: true,
      invoke: [
        {
          src: 'boundsListener',
          id: 'boundsListener',
        },
        {
          src: 'windowListener',
          id: 'windowListener',
        },
        {
          src: 'windowBlurService',
          id: 'windowBlurService',
        },
        {
          src: 'windowResizeService',
          id: 'windowResizeService',
        },
      ],
      id: 'mouse-machine',
      description:
        '## services\n- **boundsListener**: this will create the intersection observer to get all the bounds from the visible blocks',
      initial: 'inactive',
      states: {
        active: {
          entry: ['getBlockBounds', 'assignCurrentBound'],
          description:
            'actions:\n- **getBlockBounds**: this will calculate the current position of all the visible blocks in the viewport\n- **assignBlockRef**: stores the current hovered block in context',
          initial: 'ready',
          states: {
            stopped: {
              on: {
                'DISABLE.BLOCKTOOLS.CLOSE': {
                  actions: ['getBlockBounds', 'assignCurrentBound'],
                  target: 'ready',
                },
              },
            },
            ready: {
              on: {
                'MOUSE.MOVE': [
                  {
                    actions: 'assignCurrentBound',
                    description:
                      'will capture the mouse movement on the pag emain component and store in in context',
                    cond: 'hoverNewBlockId',
                  },
                  {},
                ],
                'DISABLE.CHANGE': {
                  description:
                    "should be triggered everytime there's a change in the editor (editor's onChange event)",
                  target: '#mouse-machine.inactive',
                },
                'DISABLE.SCROLL': {
                  description:
                    'when the user scrolls the page, we should disable the calculations',
                  target: '#mouse-machine.inactive',
                },
                'DISABLE.BLOCKTOOLS.OPEN': {
                  target: 'stopped',
                },
              },
            },
          },
        },
        inactive: {
          entry: ['clearCurrentBound', 'clearBlockBounds'],
          on: {
            'MOUSE.MOVE': {
              target: 'active',
            },
          },
        },
      },
      on: {
        'INIT.OBSERVER': {
          actions: 'assignObserver',
        },

        'BLOCK.ADD': {
          actions: 'addVisibleBlock',
        },

        'BLOCK.REMOVE': {
          actions: 'removeVisibleBlock',
        },

        'BLOCK.OBSERVE': {
          actions: 'blockObserve',
        },

        'DISABLE.WINDOW.BLUR': {
          description:
            'when the window gets inactive, the machine should get inactive too',
          target: '.inactive',
        },

        'DISABLE.WINDOW.RESIZE': {
          description:
            'when the window gets inactive, the machine should get inactive too',
          target: '.inactive',
        },

        'HIGHLIGHT.ENTER': {
          actions: ['assignHighlightRef', 'emitAll'],
        },

        'HIGHLIGHT.LEAVE': {
          actions: ['clearHighlightRef', 'emitAll'],
        },

        'HIGHLIGHT.FROM.WINDOWS': {
          actions: ['assignHighlightRef'],
          description:
            'this event is triggered from the tauri window listener to update the ref hovered in all windows. (apply new style on page main component)',
        },
      },
    },
    {
      actions: {
        emitAll: (_, event) => {
          invoke('emit_all', {
            event: 'hover_ref',
            payload: event.type == 'HIGHLIGHT.ENTER' ? event.ref : undefined,
          })
        },
        assignHighlightRef: assign({
          highlightRef: (_, event) => event.ref,
        }),
        clearHighlightRef: assign({
          // eslint-disable-next-line
          highlightRef: (c) => '',
        }),
        clearBlockBounds: assign({
          // eslint-disable-next-line
          visibleBounds: (c) => [],
        }),
        clearCurrentBound: assign({
          // eslint-disable-next-line
          visibleBounds: (c) => [],
        }),
        getBlockBounds: assign({
          visibleBounds: (context) => {
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
        assignCurrentBound: assign((context, event) => {
          let currentBound = context.visibleBounds.find(([, rect]) =>
            event.type == 'MOUSE.MOVE'
              ? event.position >= rect.top && event.position <= rect.bottom
              : false,
          )

          return {
            currentBound,
            // highlightRef: currentBound ? currentBound[1].dataset.highlight : '',
          }
        }),
        blockObserve: (context, event) => {
          context.observer?.observe(event.entry)
        },
        addVisibleBlock: assign({
          visibleBlocks: (context, event) => {
            let tMap = new Map(context.visibleBlocks)
            tMap.set(event.blockId, event.entry)
            return [...tMap]
          },
        }),
        removeVisibleBlock: assign({
          visibleBlocks: (context, event) => {
            let tMap = new Map(context.visibleBlocks)
            tMap.delete(event.blockId)
            return [...tMap]
          },
        }),
      },
      guards: {
        hoverNewBlockId: () => {
          // if (!c.currentBound?.[1]) return true
          // let {top, height} = c.currentBound[1]
          // return e.position < top && e.position > top + height
          return true
        },
      },
      services: {
        windowBlurService: () => (sendBack) => {
          window.addEventListener('blur', onBlur)

          return function detachWindowBlurService() {
            window.removeEventListener('blur', onBlur)
          }

          function onBlur() {
            sendBack('DISABLE.WINDOW.BLUR')
          }
        },
        windowListener: () => (sendBack) => {
          var unlisten: undefined | UnlistenFn

          bootListener()

          async function bootListener() {
            unlisten = await listen<string>('hover_ref', (event) => {
              // let ref = event.payload ?? undefined
              // let currentRef = document.body.dataset.hoverRef
              // if (ref != currentRef) {
              //   sendBack({type: 'FROM.WINDOWS', ref})
              // }
              sendBack({type: 'HIGHLIGHT.FROM.WINDOWS', ref: event.payload})
            })
          }

          return () => {
            unlisten?.()
          }
        },
        boundsListener: () => (sendBack) => {
          let options = {
            threshold: [0.33, 0.66],
          }
          let observer = new IntersectionObserver(callback, options)
          sendBack({type: 'INIT.OBSERVER', observer})

          // =============

          function callback(entries: Array<IntersectionObserverEntry>) {
            for (const entry of entries) {
              let {parentBlock} = (entry.target as HTMLElement).dataset
              if (parentBlock) {
                if (entry.isIntersecting) {
                  // console.log('INTERSECTING!', entry.target.dataset)
                  sendBack({
                    type: 'BLOCK.ADD',
                    blockId: parentBlock,
                    entry: entry.target as HTMLElement,
                  })
                } else {
                  // console.log('NOT INTERSECTING!', entry.target.dataset)
                  sendBack({
                    type: 'BLOCK.REMOVE',
                    blockId: parentBlock,
                  })
                }
              }
            }
          }

          return () => {
            observer.disconnect()
          }
        },
        windowResizeService: () => (sendBack) => {
          window.addEventListener('resize', handler)

          return () => {
            window.removeEventListener('resize', handler)
          }

          function handler() {
            sendBack('DISABLE.WINDOW.RESIZE')
          }
        },
      },
    },
  )
