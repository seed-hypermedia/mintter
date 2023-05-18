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

type MouseContext = {
  visibleBounds: Array<Bound>
  observer?: IntersectionObserver
  visibleBlocks: Array<VisibleBlock>
  hoveredBlockId?: string
}

export var mouseMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QFsD2BXWYC0yCGAxgBYCWAdmAMQCSActQCoB0A8gEIDKAogEoBqvANoAGALqJQAB1SwSAFxKoyEkAA9EAdgCsARiZbhWgEy6AHBo06AnKYA0IAJ6Idw00xc6tANgAsG06Y2plpaAL6h9miYOPjE5FRsADIsAMIA0kwAggAi2SLiSCDSsgpKKuoI2kZMVgYhPlqmXjoAzEY69k4IOkbhkRhYuISkFJRJqRk8XACyLAL5KsXyisqFFRo+1U1GXkYtGl6GVhudzrsa+sJeXrUG5j61fSBRg7EjCcnprJy882KLMmWZTWmgaTDaXia3i0GweXlO3Q0eyYh1MOmCLS8ByhTxeMWG8Uo2WoHEySS4TAA6nRsixKUwkgBVHgLQpLUqrUAVLEInQPHxMYTtYQ6SxIh7GXEDfFxUbE0nkqk0ulMKYcagALS4rKkgI55UQPMczhaVmqWhaFpaAUxRh8fKl0SGsrATEICgAbq7YHJUJJJJAiSSyYkKeN0gwWCxEhwmClktwdUU9SsDQhjBcbFYvC1PMdzEYNLzhA8mGirJ4YdphCKNI7XgSKG6CJ7vb7-YH5SGKdkeJkAOJMLi0PL-Nkp4Fcw1XQXeYQaK7NUwmFoI5dedx7bRimuBOsRZ7S53vZutpgAJzAeAgDkos0Z3CYsz+BV1JVTIO6PQRZr0Xi0Vg2Fi1j+L0B54se8SniQXoXleN53iwD4Us+2o6K+ybvpOahnNU85oqakI+C0Phoj4a6WO4C77IEfhWA0+79E6bxQe6MGupe163l2iopAAEpktD9tqY5vkCnI4QgxwtIKzS5migTNN4CJYlYZamMIFYaSK2ZGKY9YyiebGwZxCE8aGTAcCkPDRokSbsh+U5SRoMlXK06Lotmnjwsa6b+OCtR7Nm-4LuYBmQU2xkcfB3HBoq4ZpJG0axiwAAKw72ROEkVBmNSKbmAH+EiRa+fRbimKa9FCrmbT0eFLGRS27FwVxQYKhZvYDpZDCZDwDCZVh2WILlWY5nmRWFj+gHgkYtSkTWuYhfVjauuQUWIchT5zCJGEOdh6wlV0PRIkwGhWIYJG1MIbQtC04QHmQqAQHAKgQQ1YAAoNaY6D5XR6cIp3XT0tQWMcjGHsxK3QV6n3iWmvgIt4FzXHyLn7AtDzLS60Ntn6AYQLD+qfsuAoiuimlGEKViYlYU0CvNjRIiYNjWFjRlNSZMWE45kkmNUppXAYkJ2q4RhGMWLmnVWP2BAVhhs1Ba0cx945fZ+rS+LOmkuDWJg9L9zh7BuZ2+BmFW+BY92hEAA */
    predictableActionArguments: true,
    context: {visibleBounds: [], visibleBlocks: []},
    tsTypes: {} as import('./mouse-machine.typegen').Typegen0,
    schema: {context: {} as MouseContext, events: {} as MouseEvent},
    invoke: [
      {
        src: 'boundsListener',
        id: 'boundsListener',
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
    initial: 'active',
    states: {
      active: {
        entry: ['getBlockBounds'],
        description:
          'actions:\n- **getBlockBounds**: this will calculate the current position of all the visible blocks in the viewport\n- **assignBlockRef**: stores the current hovered block in context',
        initial: 'ready',
        states: {
          stopped: {
            on: {
              'DISABLE.BLOCKTOOLS.CLOSE': {
                actions: ['getBlockBounds'],
                target: 'ready',
              },
            },
          },
          ready: {
            on: {
              'MOUSE.MOVE': {
                internal: true,
                actions: ['assignCurrentBound'],
                description:
                  'will capture the mouse movement on the pag emain component and store in in context',
              },

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
    },
  },
  {
    actions: {
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
        observer: (_, event) => {
          return event.observer
        },
      }),
      assignCurrentBound: assign({
        hoveredBlockId: (context, event) => {
          let res = undefined

          for (let [id, rect] of context.visibleBounds) {
            if (
              event.type == 'MOUSE.MOVE' &&
              event.position >= rect.top &&
              event.position <= rect.bottom
            ) {
              res = id
              break
            }
          }
          return res
        },
        // context.visibleBounds.find(([, rect]) =>
        //   event.type == 'MOUSE.MOVE'
        //     ?
        //     : false,
        // ),
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
      boundsListener: () => (sendBack) => {
        let options = {
          threshold: [0.33, 0.66],
        }
        let observer = new IntersectionObserver(callback, options)
        sendBack({type: 'INIT.OBSERVER', observer})

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
        window.addEventListener('PANEL.RESIZE', handler)

        return () => {
          window.removeEventListener('PANEL.RESIZE', handler)
        }

        function handler() {
          sendBack('DISABLE.WINDOW.RESIZE')
        }
      },
    },
  },
)
