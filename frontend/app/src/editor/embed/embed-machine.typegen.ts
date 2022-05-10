// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignPublication: 'REPORT.PUBLICATION.SUCCESS'
    assignError: 'REPORT.PUBLICATION.ERROR' | 'REPORT.BLOCK.ERROR'
    assignBlock: 'REPORT.BLOCK.SUCCESS'
  }
  internalEvents: {
    'xstate.init': {type: 'xstate.init'}
    'done.invoke.fetchPublication': {
      type: 'done.invoke.fetchPublication'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.fetchPublication': {
      type: 'error.platform.fetchPublication'
      data: unknown
    }
    'done.invoke.filderBlock': {
      type: 'done.invoke.filderBlock'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.filderBlock': {
      type: 'error.platform.filderBlock'
      data: unknown
    }
  }
  invokeSrcNameMap: {
    fetchPublication: 'done.invoke.fetchPublication'
    filterBlock: 'done.invoke.filderBlock'
  }
  missingImplementations: {
    actions: 'assignPublication' | 'assignError' | 'assignBlock'
    services: 'fetchPublication' | 'filterBlock'
    guards: never
    delays: never
  }
  eventsCausingServices: {
    fetchPublication: 'xstate.init'
    filterBlock: 'REPORT.PUBLICATION.SUCCESS'
  }
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates:
    | 'loading'
    | 'loading.publication'
    | 'loading.block'
    | 'ready'
    | 'error'
    | {loading?: 'publication' | 'block'}
  tags: never
}
