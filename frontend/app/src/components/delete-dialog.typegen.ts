// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    onSuccess: 'done.invoke.deleteEntry'
    onError: 'error.platform.deleteEntry'
  }
  internalEvents: {
    'done.invoke.deleteEntry': {
      type: 'done.invoke.deleteEntry'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.deleteEntry': {
      type: 'error.platform.deleteEntry'
      data: unknown
    }
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {
    deleteEntry: 'done.invoke.deleteEntry'
  }
  missingImplementations: {
    actions: 'onSuccess'
    services: 'deleteEntry'
    guards: never
    delays: never
  }
  eventsCausingServices: {
    deleteEntry: 'DELETE.DIALOG.CONFIRM'
  }
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates:
    | 'closed'
    | 'opened'
    | 'opened.idle'
    | 'opened.deleting'
    | 'opened.errored'
    | 'opened.canceled'
    | 'opened.dismiss'
    | {opened?: 'idle' | 'deleting' | 'errored' | 'canceled' | 'dismiss'}
  tags: never
}
