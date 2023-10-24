export type StateStream<V> = {
  get: () => V
  subscribe: (handler: (value: V) => void) => () => void
}

export type Updater<S> = (prevState: S) => S

export function writeableStateStream<S extends Object | null>(
  initState: S,
): [(newState: S | Updater<S>) => void, StateStream<S>] {
  let state: S = initState
  const handlers = new Set<(state: S) => void>()
  function writeState(updater: S | Updater<S>) {
    const newState = typeof updater === 'function' ? updater(state) : updater

    state = newState

    handlers.forEach((handle) => handle(newState))
  }
  const stream = {
    get() {
      return state
    },
    subscribe(handler: (state: S) => void) {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
  }
  return [writeState, stream]
}

export type EventStream<V> = {
  subscribe: (handler: (value: V) => void) => () => void
}

export function eventStream<EventValue>(): readonly [
  (value: EventValue) => void,
  EventStream<EventValue>,
] {
  const handlers = new Set<(event: EventValue) => void>()

  function dispatch(event: EventValue) {
    handlers.forEach((handle) => handle(event))
  }

  const stream = {
    subscribe(handler: (event: EventValue) => void) {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
  }

  return [dispatch, stream] as const
}
