import type {Embed} from '@mintter/mttast'
import {useActor, useInterpret} from '@xstate/react'
import {embed} from 'frontend/mttast-builder/dist'
import {createContext, MouseEvent, MutableRefObject, useContext, useEffect} from 'react'
import {createMachine, assign, Interpreter, State} from 'xstate'

export type HoverMachineEvent =
  | {
      type: 'MOUSEENTER_EMBED'
      payload: string
    }
  | {
      type: 'MOUSELEAVE_EMBED'
      payload: string
    }

export type HoverMachineContextType = {statement: any; embed: string | null}
export const hoverMachine = createMachine<HoverMachineContextType, HoverMachineEvent>(
  {
    id: 'hover-machine',
    context: {
      statement: null,
      embed: null,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          MOUSEENTER_EMBED: {
            target: 'idle',
            actions: ['setEmbedToContext'],
          },
          MOUSELEAVE_EMBED: {
            target: 'idle',
            actions: ['clearEmbedFromContext'],
          },
        },
      },
    },
  },
  {
    actions: {
      // setStatementToContext: assign({
      //   statement: (_, event) => event.target,
      // }),
      // clearStatementFromContext: assign((context) => {
      //   return {
      //     ...context,
      //     statement: null,
      //   }
      // }),
      setEmbedToContext: assign({
        embed: (_, event) => event.payload,
      }),
      clearEmbedFromContext: assign((context) => ({
        ...context,
        embed: null,
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

export function useEmbedHover(ref: MutableRefObject<HTMLDivElement | HTMLQuoteElement | null>, embedUrl: string) {
  const {service} = useContext(HoverContext)
  if (!service) {
    throw new Error(`"useHover" must be called within a "<HoverProvider />" component`)
  }
  const {send} = service
  const [state] = useActor(service)

  useEffect(() => {
    function setHover(event: Event): void {
      event.stopPropagation()
      send({type: 'MOUSEENTER_EMBED', payload: embedUrl})
    }

    function unsetHover(event: Event): void {
      event.stopPropagation()
      send({type: 'MOUSELEAVE_EMBED', payload: embedUrl})
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
    embed: state.context.embed,
  }
}
