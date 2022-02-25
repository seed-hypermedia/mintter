// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignPublication: 'CITATION.FETCH.SUCCESS'
    assignBlock: 'CITATION.FETCH.SUCCESS'
    assignAuthor: 'CITATION.FETCH.SUCCESS'
    assignError: 'CITATION.FETCH.ERROR'
    openInSidepanel: 'OPEN.IN.SIDEPANEL'
    clearError: 'RETRY'
  }
  internalEvents: {
    'xstate.init': {type: 'xstate.init'}
    'done.invoke.fetchCitation': {
      type: 'done.invoke.fetchCitation'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.fetchCitation': {type: 'error.platform.fetchCitation'; data: unknown}
  }
  invokeSrcNameMap: {
    fetchCitation: 'done.invoke.fetchCitation'
  }
  missingImplementations: {
    actions: 'assignPublication' | 'assignBlock' | 'assignAuthor' | 'assignError' | 'openInSidepanel' | 'clearError'
    services: 'fetchCitation'
    guards: never
    delays: never
  }
  eventsCausingServices: {
    fetchCitation: 'RETRY'
  }
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates: 'loading' | 'ready' | 'errored'
  tags: never
}
