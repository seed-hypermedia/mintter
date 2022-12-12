import {useMachine} from '@xstate/react'
import {PropsWithChildren, useEffect, useRef} from 'react'
import {assign, createMachine} from 'xstate'
import getFocusableElements from './get-focusable-elements'

export function BurgerMenu({
  children,
  maxWidth = 600,
}: PropsWithChildren<{maxWidth?: number}>) {
  let rootRef = useRef<HTMLDivElement>(null)
  let [state, send] = useMachine(() => createBurgerMenuMachine({maxWidth}))
  let isOpen = state.matches('enabled.opened')

  useEffect(() => {
    if (rootRef.current && rootRef.current.parentNode) {
      send({type: 'MENU.INIT', ref: rootRef.current.parentNode})
    }
  }, [rootRef.current])

  return (
    <div
      ref={rootRef}
      className="burger-menu"
      data-status={state.matches('enabled.opened') ? 'open' : 'close'}
      data-enable={state.matches('enabled')}
    >
      <button
        className="burger-menu__trigger"
        type="button"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen ? 'true' : 'false'}
        data-element="burger-menu-trigger"
        onClick={() => {
          send({type: 'MENU.TOGGLE'})
        }}
      >
        <span className="burger-menu__bar" aria-hidden="true" />
      </button>
      <div className="burger-menu__panel">{children}</div>
    </div>
  )
}

type BurgerMachineContext = {
  elementRef?: ParentNode
  focusableElements: ReturnType<typeof getFocusableElements>
  observer?: ResizeObserver
}

type BurgerMachineEvent =
  | {
      type: 'MENU.TOGGLE'
    }
  | {
      type: 'MENU.ENABLE'
    }
  | {
      type: 'MENU.DISABLE'
    }
  | {
      type: 'MENU.OPEN'
    }
  | {
      type: 'MENU.CLOSE'
    }
  | {
      type: 'MENU.INIT'
      ref: ParentNode
    }
  | {
      type: 'MENU.OBSERVER.READY'
      observer: ResizeObserver
    }
  | {
      type: 'MENU.OBSERVER.ERROR'
      error: unknown
    }

type BurgerMenuMachineConfig = {
  maxWidth?: number
}

function createBurgerMenuMachine({maxWidth}: BurgerMenuMachineConfig) {
  /** @xstate-layout N4IgpgJg5mDOIC5QCMCuAnG6C0BbMAdqngIYDGAFgJYFgDEAsgKIByAqgHSsCCAQgDJMA2gAYAuolAAHAPawqAFyoyCkkAA9EAFgCMWjgGYAbAA4dBnQHYAnACYt181oA0IAJ6IDBgKwddBxxNvS28RSx1rAF9I1zRMMBx8IlJKGnpmdg4AEQBJAGU+QVEJJBBZeSUVNU0EYJEObxMDLTCjRyMtWyNXDwRbW2sGk3tvTu9gx0to2IwsPEJiXHJqWg4qCAAbdNZOHJYcgBVitXLFZVVSmtsRIwade3CDEKb7bvdEHSMdDhFvAybGrYdCIdN4OtMQHE5klFss0hxCCRkFsIIwdhwAPIABVYx1Kp0qF1ANXulg41ksZka5mC3j0lh6iBC+msjRaRlsxhMWi8EKhCXmySWqVWiORkDRmQAwvwMXlhOITnIzlVLh9bGSKVSzD4QvTGQgvrYOEDLFpvPYNZ9WXzZgKYSkVmAEQQkSiODIpIQJRlOAcMQBxANFRX45WE6qIMG3J4gp6hYImSwM961ZMcDqfERdCzhBy2+KJBaO+Fi91kDZyH3o-1BkMlaTh86R2pGGOWOMhX6U5MGjkmDjmHR6cbjESObzRGIgAgyCBwNT8otCuG0JUVZtqhDYP4cYZGEQif5jDVvXo78kmQ8GG46EzWDnjKLTpeC2Ei53rLbrlVEjSIC992vblbAtEJrBMA0IjJT5Hk6EQTCMZNOgLaFi2FJ0XTdSAfwjLcbHJSlQR1Wl9VTBx6lBbxrHHMFhw1VD7XQ1dnTLSAPS9WgIFwzdiSZf491+I9T3GNsdD7MIMx8bNqOsXQLQMRjl3fTC2IgDgKyrbiww3VU+L6e9DAiG9KSTBCEJTXpGkGfpzFZIw-lPLQlLfEtVggKhYGw7TG10v8ajsAcLDsMEgmublrCg2wBwcIi82HSwD0UqcgA */
  return createMachine(
    {
      initial: 'idle',
      context: {
        elementRef: undefined,
        focusableElements: [],
      },
      states: {
        idle: {
          on: {
            'MENU.INIT': {
              internal: true,
              actions: [
                'setElementRef',
                'startObserver',
                'setFocusableElements',
              ],
            },
          },
        },
        enabled: {
          initial: 'closed',
          states: {
            opened: {
              entry: ['removeTabIndexToElements'],
              on: {
                'MENU.TOGGLE': 'closed',
              },
            },
            closed: {
              entry: 'setTabIndexToElements',
              on: {
                'MENU.TOGGLE': 'opened',
              },
            },
          },

          on: {
            'MENU.OPEN': '.opened',
            'MENU.CLOSE': '.closed',
          },
        },
        disabled: {
          entry: ['removeTabIndexToElements'],
        },
      },

      id: 'burger-menu-machine',
      schema: {
        events: {} as BurgerMachineEvent,
        context: {} as BurgerMachineContext,
      },
      tsTypes: {} as import('./burger-menu.typegen').Typegen0,
      predictableActionArguments: true,

      invoke: {
        src: 'resizeObserver',
        id: 'resizeObserver',
      },

      on: {
        'MENU.ENABLE': '.enabled',
        'MENU.DISABLE': '.disabled',
        'MENU.OBSERVER.READY': {
          actions: ['setObserver'],
        },
      },
    },
    {
      services: {
        resizeObserver: () => (sendBack) => {
          try {
            let observer = new ResizeObserver((observedItems) => {
              const {contentRect} = observedItems[0]
              if (contentRect.width <= 600) {
                sendBack('MENU.ENABLE')
              } else {
                sendBack('MENU.DISABLE')
              }
            })

            if (observer) {
              console.log('observer', observer)
              sendBack({type: 'MENU.OBSERVER.READY', observer})
            }
          } catch (error) {
            sendBack({type: 'MENU.OBSERVER.ERROR', error})
          }
        },
      },

      actions: {
        setElementRef: assign({
          // @ts-ignore
          elementRef: (c, event) => event.ref,
        }),
        setFocusableElements: assign({
          // @ts-ignore
          focusableElements: (c, event) =>
            event.ref ? getFocusableElements(event.ref) : [],
        }),
        removeTabIndexToElements: (context: BurgerMachineContext) => {
          context.focusableElements.forEach((el) =>
            el.removeAttribute('tabindex'),
          )
        },
        setTabIndexToElements: (context: BurgerMachineContext) => {
          ;[...context.focusableElements]
            .filter(
              // @ts-ignore
              (el) => el.getAttribute('data-element') !== 'burger-menu-trigger',
            )
            // @ts-ignore
            .forEach((element) => element.setAttribute('tabindex', '-1'))
        },
        startObserver: (context: BurgerMachineContext) => {
          if (context.elementRef) {
            context.observer?.observe(context.elementRef as Element)
          } else {
            console.error(
              'BURGER MENU ERROR: no elementRef set in context (in startObserver)',
            )
          }
        },
        setObserver: assign({
          // @ts-ignore
          observer: (c, event) => event.observer,
        }),
      },
    },
  )
}
