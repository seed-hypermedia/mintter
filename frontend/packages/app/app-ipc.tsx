export type AppIPC = {
  invoke: (cmd: string, data?: any) => Promise<any>
  send: (cmd: string, data?: any) => Promise<any>
  listen: <T = unknown>(
    cmd: string,
    handler: (value: T) => void,
  ) => Promise<() => void>
}

export type Event<T> = {
  /** Event name */
  event: string
  /** The label of the window that emitted this event. */
  windowLabel: string
  /** Event identifier used to unlisten */
  id: number
  /** Event payload */
  payload: T
}

export type EventCallback<T> = (event: Event<T>) => void
