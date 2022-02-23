// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    persist: 'SIDEPANEL.ADD' | 'SIDEPANEL.REMOVE' | 'SIDEPANEL.CLEAR'
  }
  internalEvents: {
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {}
  missingImplementations: {
    actions: never
    services: never
    guards: never
    delays: never
  }
  eventsCausingServices: {}
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates: 'idle' | 'errored' | 'ready' | 'ready.closed' | 'ready.opened' | {ready?: 'closed' | 'opened'}
  tags: never
}
