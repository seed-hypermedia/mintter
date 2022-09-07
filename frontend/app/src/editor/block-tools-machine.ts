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
  /** @xstate-layout N4IgpgJg5mDOIC5QCMA2B7AxgawC7vVVgFoBbAQ0wAsBLAOzADpLcaA3JzDWMAYgFkA8gFUAygFFGQgGrjEoAA7pYNVujryQAD0QAOAKwBmRgHYTugGwAWXSYAMVowCZ9AGhABPRPtuML-kwBOAEYLJytAg2CAX2j3NCw8AiIySloGZkxWDkYuZT4AEQAlQQAFAsEAdQA5RjLxas0lFTUNJG1EYLtg3UYnLsC7Qzt9fzD3LwQTfr6LB0MnQ10rYMMTWPiMHHxCEgpqeiYWdiZ0BTA6XmKyiprGAGEAGUEJJuVVGnVNHQQu4KtGFYrEFgoElvo7HNghNEHNAqYLLpFoFgWswhsQAltsk9mlDplsnxxAUAJIAFRJ1QA4m8Wp82qAfk5FoxlrpAvYTPoudZrDCEAYLIxwYZIk4Qvp-voMVikrtUgcMvRjjkaBBUETSRTqbSPl92j9DNzASjdPNBVZwvyLEa-EaIcy1sMVjKtnKUvt0kxlVkTow1RreFpYLhyLgjgAzcMAJwAFBC7ABKXiynYevFKugq73qsC61rfWEzCH6ZnhFyDQJOflc-SMLorYGhfo+XSuxJp3GK71Z305CA0WDkNCQXj5+mFhCGRGMOx2Fw9SHz+fQzzeXwWDkoqz2yxWCzt7Hyz2HXgNMlFACajAAggUCuP9YzYStZjuwcNzLp+RzGIMwoM+j6JEEROOscSYm6nYKl6Z7VBe14FOIjziGScjtM0eoMh0CBhL0gSRCCc4rtWa6-E4h7ul2sHnledQAEISEUsiPthPxhE49aLDyui6KKvH8l0zJ9OKDibiYhjDNYlHQSeDC8IIjHiMxymsZOYRCqEFjTGWdjsj+07CsySItvYvGBDJOIwaelSUrcjD0Y8whFGpBqwiY-JGL0LhONYTjdKsOmxBBdDoBAcCaKmVlyUcfacNweYYe8BZuQKPj1iYPSGEC9g9BJNbpSs-iDHOgojJZx4ZrFhKMGcFyuc+5HBMEjDATaDhgqsQHWo4s5OLYQwmP43SBNKEFRZV3YEicDU4Ui8JmHuA2OAsbhkaKnFBECzLdAYQ1rBV6ZTT6NUBolijJROqUuL0bIcnYXI8vuVieVWf7hPo+7Mj4jgWeNUHRVV-q9jVA5DiOECzT8wKcXxCyVhYUrAa9LXLGsXLLmYQ2HdR+InTNSV0k+OGLACd2ctyozPZ5wR1tMVaSSYO6fUBOPWQwUOIDugmI3+aKGFl1h6YswXREAA */
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
        {
          src: 'mouseListener',
          id: 'mouseListener',
        },
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
