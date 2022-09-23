import {assign, createMachine} from 'xstate'

export type BlockToolsMachineContext = {
  visibleBlocks: Array<
    [key: string, entry: IntersectionObserverEntry['target']]
  >
  currentBounds: Array<[key: string, rect: DOMRect]>
  mouseY: number
  observer?: IntersectionObserver
  currentId: string
  rootElm: HTMLElement | null
}
export type BlockToolsMachineEvent =
  | {type: 'DISABLE'}
  | {type: 'EDITING'}
  | {type: 'DROPDOWN.OPEN'}
  | {type: 'DROPDOWN.CLOSE'}
  | {type: 'OBSERVER'; observer: IntersectionObserver}
  | {type: 'MOUSE.MOVE'; mouseY: number}
  | {type: 'ENTRY.OBSERVE'; entry: HTMLElement}
  | {type: 'ENTRY.ADD'; id: string; entry: IntersectionObserverEntry['target']}
  | {type: 'ENTRY.DELETE'; id: string}
  | {type: 'WINDOW.BLUR'}

export const blockToolsMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QCMA2B7AxgawC7vVVgFoBbAQ0wAsBLAOzADpLcaA3JzDWMAYgFkA8gFUAygFFGQgGrjEoAA7pYNVujryQAD0QAOAKwBmRgHYTugGwAWXSYAMVowCZ9AGhABPRPtuML-kwBOAEYLJytAg2CAX2j3NCw8AiIySloGZkxWDkYuZT4AEQAlQQAFAsEAdQA5RjLxas0lFTUNJG1EYLtg3UYnLsC7Qzt9fzD3LwQTfr6LB0MnQ10rYMMTWPiMHHxCEgpqeiYWdiZ0BTA6XmKyiprGAGEAGUEJJuVVGnVNHQQu4KtGFYrEFgoElvo7HNghNEHNAqYLLpFoFgWswhsQAltsk9mlDplsnxxAUAJIAFRJ1QA4m8Wp82qAfk5FoxlrpAvYTPoudZrDCEAYLIxwYZIk4Qvp-voMVikrtUgcMscOFcSaIAIIAIUecnazQ+X3aP1WQMY+n0g2cui6dg5-McJkBJisFi5wRM-2RMq2cpS+3STHoysDEFQRNJFOptINDI6CEMYVMNjmhm5gRCFkM-MRxl5gXNJmGhgigW9iR2frxGSDWROjBoob4WlguHIuCOADN2wAnAAUELsAEpeLKK7jFYG6MH643o61vrCZhD9Mzwi5BoEnPyufpGF0VsDQv0fLoy9j5f78TXCYwIDRYOQ0JBeHP6Qv44jGHY7C4epCfz+0KeN4vgWByKJWKmPi8mevrjgGvANGSRQAJqMOqBQFK+hqMrCKyzJBYLDOYuj8hyjCDGEloWssm7rHEmI+mOCoIUhqGMAU4g6mSuqKO885GouvTprYITfoBW7Ab8Tiwcxl4MIh1TIWhgiahIRSyNhsY-GETh7osPK6LoopGfyXTMn04oOGBhbDNYsk4ixhy8Kp6myEUWnvmEQqhK6q5OHY7JkQmwrMkix72EZpYMaOjnyXwlSUrcjDasIHl6vxb6CQgrr8kYvQuE41gBcEqzTDJGJ0OgEBwJosUXlWRy1jkeQ8J52UGL07o9MWwLdLYWZSVyvQrP4gzfoKIwOQ1E4EnWZwXO1uHSaVZqBJmDhgqs5rZo4X5OLYQwmP43T5tNlazcGS1xki8JmJYNj2I4CxuFJop6UEQK2uyx0WDEMVMXFjX1lOzUhmG11Mj4rI2BydhcjyLpWHlm4UeE+gusyPiONFmzlkDs3XnWd4Pk+ECQ4gwJ6cZCwbn9jgWijwQw2sXIAWYx3nfBV6g4SFMIIsAJsnDCOjEjeXBLu0wSkVBgQbjjH4zNAb85BZl-RRaw+AFELFk4zqxLEQA */
  createMachine(
    {
      context: {
        visibleBlocks: [],
        currentBounds: [],
        mouseY: -999,
        currentId: '',
        observer: undefined,
        rootElm: document.querySelector(':root') as HTMLElement,
      },
      tsTypes: {} as import('./block-tools-machine.typegen').Typegen0,
      schema: {
        events: {} as BlockToolsMachineEvent,
        context: {} as BlockToolsMachineContext,
      },
      predictableActionArguments: true,
      invoke: [
        {
          src: 'visibilityObserver',
          id: 'visibilityObserver',
        },
        {
          src: 'windowBlurService',
          id: 'windowBlurService',
        },
        // {
        //   src: 'mouseListener',
        //   id: 'mouseListener',
        // },
      ],
      id: 'blocktools-machine',
      initial: 'inactive',
      states: {
        active: {
          entry: ['initToolsPosition', 'getBlockBounds', 'assignCurrentId'],
          initial: 'close',
          states: {
            close: {
              on: {
                'MOUSE.MOVE': {
                  actions: [
                    'assignMousePosition',
                    'assignCurrentId',
                    'assignCurrentPosition',
                  ],
                },
                'DROPDOWN.OPEN': {
                  target: 'open',
                },
              },
            },
            open: {
              on: {
                'DROPDOWN.CLOSE': {
                  target: 'close',
                },
              },
            },
          },
          on: {
            EDITING: {
              target: 'inactive',
            },
            DISABLE: {
              target: 'inactive',
            },
          },
        },
        inactive: {
          initial: 'idle',
          states: {
            idle: {
              after: {
                '500': {
                  target: '#blocktools-machine.active.close',
                },
              },
              on: {
                EDITING: {
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
          actions: ['clearCurrentId', 'resetPosition'],
          target: '.inactive',
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
        // mouseListener: () => (sendBack) => {
        //   function mouseCallback(event: MouseEvent) {
        //     sendBack({type: 'MOUSE.MOVE', mouseY: event.clientY})
        //   }
        //   window.addEventListener('mousemove', mouseCallback)

        //   return () => {
        //     window.removeEventListener('mousemove', mouseCallback)
        //   }
        // },
        visibilityObserver: () => (sendBack) => {
          function callback(entries: Array<IntersectionObserverEntry>) {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                // console.log('IS INTERSECTING!', entry.target.dataset)
                sendBack({
                  type: 'ENTRY.ADD',
                  id: (entry.target as HTMLElement).dataset.parentBlock || '',
                  entry: entry.target,
                })
              } else {
                // console.log('NOT INTERSECTING!', entry.target.dataset)
                sendBack({
                  type: 'ENTRY.DELETE',
                  id: (entry.target as HTMLElement).dataset.parentBlock || '',
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
        initToolsPosition: (context) => {
          context.rootElm?.style.setProperty('--tools-x', '-999')
          context.rootElm?.style.setProperty('--tools-y', '-999')
        },
        clearCurrentId: assign({
          // eslint-disable-next-line
          currentId: (c) => '',
        }),
        resetPosition: assign({
          // eslint-disable-next-line
          mouseY: (c) => -999,
        }),
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
              context.rootElm?.style.setProperty(
                '--tools-y',
                `${rect.top - 40}`,
              )
            }
          }
        },
      },
    },
  )
