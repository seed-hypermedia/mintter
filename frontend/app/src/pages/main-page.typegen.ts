// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    closeLibrary: 'xstate.init'
    createNewDraft: ''
    navigateToPublication: ''
  }
  internalEvents: {
    '': {type: ''}
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {}
  missingImplementations: {
    actions: 'closeLibrary' | 'createNewDraft' | 'navigateToPublication'
    services: never
    guards: 'hasNoParams'
    delays: never
  }
  eventsCausingServices: {}
  eventsCausingGuards: {
    hasNoParams: ''
  }
  eventsCausingDelays: {}
  matchesStates: 'idle' | 'newDraft' | 'navigate'
  tags: never
}
