import {useSelector} from '@xstate/react'
import {createContext, useContext as defaultUseContext} from 'react'
import {ActionTypes, Interpreter} from 'xstate'

export function isNullEvent(eventName: string) {
  return eventName == ActionTypes.NullEvent
}

export function isInternalEvent(eventName: string) {
  const allEventsExceptNull = Object.values(ActionTypes).filter(
    (val) => !isNullEvent(val),
  )
  return allEventsExceptNull.some((prefix) => eventName.startsWith(prefix))
}

export function createInterpreterContext<
  TInterpreter extends Interpreter<any, any, any, any, any>,
>(displayName: string) {
  const [Provider, useContext] =
    createRequiredContext<TInterpreter>(displayName)

  const createUseSelector =
    <Data>(selector: (state: TInterpreter['state']) => Data) =>
    () => {
      return useSelector(useContext(), selector)
    }

  return [Provider, useContext, createUseSelector] as const
}

export function createRequiredContext<TContext>(displayName: string) {
  const context = createContext<TContext | null>(null)
  context.displayName = displayName
  function useContext() {
    const ctx = defaultUseContext(context)
    if (!ctx) {
      throw new Error(
        `use${displayName} must be called inside a ${displayName}Provider`,
      )
    }

    return ctx
  }

  return [context.Provider, useContext] as const
}
