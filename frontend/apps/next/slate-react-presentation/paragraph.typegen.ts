// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  internalEvents: {
    'done.invoke.paragraph-machine.getting parent:invocation[0]': {
      type: 'done.invoke.paragraph-machine.getting parent:invocation[0]'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.paragraph-machine.getting parent:invocation[0]': {
      type: 'error.platform.paragraph-machine.getting parent:invocation[0]'
      data: unknown
    }
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {
    getParent: 'done.invoke.paragraph-machine.getting parent:invocation[0]'
  }
  missingImplementations: {
    actions: never
    delays: never
    guards: never
    services: never
  }
  eventsCausingActions: {
    assignError: 'error.platform.paragraph-machine.getting parent:invocation[0]'
    assignParent: 'done.invoke.paragraph-machine.getting parent:invocation[0]'
    assignRef: 'REF'
  }
  eventsCausingDelays: {}
  eventsCausingGuards: {}
  eventsCausingServices: {
    getParent: 'REF'
  }
  matchesStates: 'error' | 'getting parent' | 'idle' | 'ready'
  tags: never
}
