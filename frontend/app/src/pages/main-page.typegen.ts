// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignUrl: 'xstate.after(1)#(machine).idle'
    assignDraftUrl: 'REDIRECT'
    closeLibrary: 'xstate.init'
  }
  internalEvents: {
    'xstate.after(1)#(machine).idle': {type: 'xstate.after(1)#(machine).idle'}
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {
    createNewDraft: 'done.invoke.(machine).newDraft:invocation[0]'
  }
  missingImplementations: {
    actions: 'assignUrl' | 'assignDraftUrl' | 'closeLibrary'
    services: 'createNewDraft'
    guards: 'shouldCreateNewDraft'
    delays: never
  }
  eventsCausingServices: {
    createNewDraft: 'xstate.after(1)#(machine).idle'
  }
  eventsCausingGuards: {
    shouldCreateNewDraft: 'xstate.after(1)#(machine).idle'
  }
  eventsCausingDelays: {}
  matchesStates: 'idle' | 'newDraft' | 'redirect'
  tags: never
}
