// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  internalEvents: {
    'done.invoke.fetchDocument': {
      type: 'done.invoke.fetchDocument'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.fetchDocument': {
      type: 'error.platform.fetchDocument'
      data: unknown
    }
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {
    fetchDocument: 'done.invoke.fetchDocument'
  }
  missingImplementations: {
    actions: 'assignDocument' | 'assignError'
    services: 'fetchDocument'
    guards: never
    delays: never
  }
  eventsCausingActions: {
    assignDocument: 'REPORT.PUBLICATION.SUCCESS'
    assignError: 'REPORT.PUBLICATION.ERROR'
  }
  eventsCausingServices: {
    fetchDocument: 'RETRY' | 'xstate.init'
  }
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates: 'error' | 'fetching' | 'ready'
  tags: 'loading'
}
