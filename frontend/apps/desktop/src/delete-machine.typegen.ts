// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  internalEvents: {
    'done.invoke.performDelete': {
      type: 'done.invoke.performDelete'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.performDelete': { type: 'error.platform.performDelete'; data: unknown }
    'xstate.init': { type: 'xstate.init' }
  }
  invokeSrcNameMap: {
    performDelete: 'done.invoke.performDelete'
  }
  missingImplementations: {
    actions: 'persistDelete'
    delays: never
    guards: never
    services: 'performDelete'
  }
  eventsCausingActions: {
    assignError: 'error.platform.performDelete'
    persistDelete: 'done.invoke.performDelete'
  }
  eventsCausingDelays: {}
  eventsCausingGuards: {}
  eventsCausingServices: {
    performDelete: 'DELETE.CONFIRM'
  }
  matchesStates:
    | 'close'
    | 'open'
    | 'open.deleted'
    | 'open.deleting'
    | 'open.idle'
    | { open?: 'deleted' | 'deleting' | 'idle' }
  tags: never
}
