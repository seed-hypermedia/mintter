// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignDocument: 'REPORT.PUBLICATION.SUCCESS'
    assignError: 'REPORT.PUBLICATION.ERROR'
  }
  internalEvents: {
    'xstate.init': {type: 'xstate.init'}
    'done.invoke.fetchDocument': {
      type: 'done.invoke.fetchDocument'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.fetchDocument': {
      type: 'error.platform.fetchDocument'
      data: unknown
    }
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
  eventsCausingServices: {
    fetchDocument: 'RETRY'
  }
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates: 'fetching' | 'ready' | 'error'
  tags: 'loading'
}
