// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  internalEvents: {
    'done.invoke.transformPublication': {
      type: 'done.invoke.transformPublication'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.transformPublication': {
      type: 'error.platform.transformPublication'
      data: unknown
    }
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {
    transformPublication: 'done.invoke.transformPublication'
  }
  missingImplementations: {
    actions: never
    delays: never
    guards: never
    services: never
  }
  eventsCausingActions: {
    setEditorValue: 'PUBLICATION.TRANSFORM.SUCCESS'
    setPublication: 'PUBLICATION.FETCH.SUCCESS'
  }
  eventsCausingDelays: {}
  eventsCausingGuards: {}
  eventsCausingServices: {
    transformPublication: 'PUBLICATION.FETCH.SUCCESS'
  }
  matchesStates: 'fetching' | 'idle' | 'settled' | 'transforming'
  tags: never
}
