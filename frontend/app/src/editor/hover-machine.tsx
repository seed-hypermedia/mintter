import {useActor, useInterpret} from '@xstate/react'
import {createContext, useContext, useEffect} from 'react'
import {assign, createMachine, Interpreter} from 'xstate'

export type HoverMachineEvent =
  | {
      type: 'MOUSEENTER_STATEMENT'
      payload: string
    }
  | {
      type: 'MOUSELEAVE_STATEMENT'
      payload: string
    }

export type HoverMachineContextType = {statement: string | null}
export const hoverMachine = createMachine<HoverMachineContextType, HoverMachineEvent>(
  {
    id: 'hover-machine',
    context: {
      statement: null,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          MOUSEENTER_STATEMENT: {
            target: 'idle',
            actions: ['setStatementToContext'],
          },
          MOUSELEAVE_STATEMENT: {
            target: 'idle',
            actions: ['clearStatementFromContext'],
          },
        },
      },
    },
  },
  {
    actions: {
      setStatementToContext: assign({
        statement: (_, event) => event.payload,
      }),
      clearStatementFromContext: assign((_) => ({
        statement: null,
      })),
    },
  },
)

export interface HoverGlobalContextType {
  service?: Interpreter<HoverMachineContextType, any, HoverMachineEvent>
}

export const HoverContext = createContext<HoverGlobalContextType>({})

export type HoverProviderProps = {
  children: React.ReactElement
  machine?: typeof hoverMachine
}

export function HoverProvider({children, machine = hoverMachine}: HoverProviderProps) {
  const service = useInterpret(machine)

  return <HoverContext.Provider value={{service}}>{children}</HoverContext.Provider>
}

export type UseHoverEventResult = {
  send: (event: HoverMachineEvent) => void
  statement: Pick<HoverMachineContextType, 'statement'>
}

/*
 * @todo useHoverEvent ref type
 */
export function useHoverEvent(ref: any, embedUrl: string): UseHoverEventResult {
  const {service} = useContext(HoverContext)
  if (!service) {
    throw new Error(`"useHoverEvent" must be called within a "<HoverProvider />" component`)
  }
  const {send} = service
  const [state] = useActor(service)

  useEffect(() => {
    function setHover(event: Event): void {
      event.stopPropagation()
      send({type: 'MOUSEENTER_STATEMENT', payload: embedUrl})
    }

    function unsetHover(event: Event): void {
      event.stopPropagation()
      send({type: 'MOUSELEAVE_STATEMENT', payload: embedUrl})
    }
    let element = ref?.current
    const isSupported = element && element.addEventListener
    if (!isSupported) return

    element!.addEventListener('mouseenter', setHover)
    element!.addEventListener('mouseleave', unsetHover)

    return () => {
      element!.removeEventListener('mouseenter', setHover)
      element!.removeEventListener('mouseleave', unsetHover)
    }
  }, [ref])

  return {
    send,
    statement: state.context,
  }
}

export function useHoverValue(): HoverMachineContextType {
  const {service} = useContext(HoverContext)
  if (!service) {
    throw new Error(`"useHoverValue" must be called within a "<HoverProvider />" component`)
  }

  const [state] = useActor(service)

  return state.context
}
