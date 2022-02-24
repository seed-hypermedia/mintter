// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {}
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
  matchesStates:
    | 'idle'
    | 'fetching'
    | 'ready'
    | 'discussion'
    | 'discussion.idle'
    | 'discussion.fetching'
    | 'discussion.ready'
    | 'discussion.finish'
    | 'errored'
    | {discussion?: 'idle' | 'fetching' | 'ready' | 'finish'}
  tags: 'pending'
}
