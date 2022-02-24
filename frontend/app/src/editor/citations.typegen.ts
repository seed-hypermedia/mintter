// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignDocumentId: 'CITATIONS.FETCH'
    assignVersion: 'CITATIONS.FETCH'
    assignCitations: 'CITATIONS.FETCH.SUCCESS'
    assignErrorMessage: 'CITATIONS.FETCH.ERROR'
    clearErrorMessage: 'CITATIONS.FETCH.RETRY'
  }
  internalEvents: {
    'xstate.init': {type: 'xstate.init'}
    'done.invoke.fetchCitations': {
      type: 'done.invoke.fetchCitations'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.fetchCitations': {type: 'error.platform.fetchCitations'; data: unknown}
  }
  invokeSrcNameMap: {
    fetchCitations: 'done.invoke.fetchCitations'
  }
  missingImplementations: {
    actions: never
    services: never
    guards: never
    delays: never
  }
  eventsCausingServices: {
    fetchCitations: 'CITATIONS.FETCH' | 'CITATIONS.FETCH.RETRY'
  }
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'ready.expanded'
    | 'ready.collapsed'
    | 'errored'
    | {ready?: 'expanded' | 'collapsed'}
  tags: never
}
