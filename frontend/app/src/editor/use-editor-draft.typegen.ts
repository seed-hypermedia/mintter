// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    displayFailedMessage: 'FETCH'
    incrementRetries: 'FETCH'
    assignDraftsValue: 'EDITOR.REPORT.FETCH.SUCCESS'
    assignError:
      | 'EDITOR.REPORT.FETCH.ERROR'
      | 'error.platform.editor.editing.saving:invocation[0]'
      | 'EDITOR.UPDATE.ERROR'
      | 'EDITOR.PUBLISH.ERROR'
    updateValueToContext: 'EDITOR.UPDATE'
    updateCurrentDocument: 'EDITOR.UPDATE' | 'EDITOR.REPORT.FETCH.SUCCESS'
    updateLibrary: 'EDITOR.UPDATE.SUCCESS'
    assignPublication: 'EDITOR.PUBLISH.SUCCESS'
    afterPublish: 'done.state.editing'
  }
  internalEvents: {
    'error.platform.editor.editing.saving:invocation[0]': {
      type: 'error.platform.editor.editing.saving:invocation[0]'
      data: unknown
    }
    '': {type: ''}
    'xstate.after(1000)#editor.editing.debouncing': {
      type: 'xstate.after(1000)#editor.editing.debouncing'
    }
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
    saveDraft: 'done.invoke.editor.editing.saving:invocation[0]'
    publishDraftService: 'done.invoke.editor.editing.publishing:invocation[0]'
  }
  missingImplementations: {
    actions: 'displayFailedMessage' | 'updateCurrentDocument' | 'afterPublish'
    services: 'publishDraftService' | 'saveDraft'
    guards: never
    delays: never
  }
  eventsCausingServices: {
    fetchDocument: '' | 'FETCH'
    publishDraftService: 'EDITOR.PUBLISH'
    saveDraft: 'xstate.after(1000)#editor.editing.debouncing'
  }
  eventsCausingGuards: {
    maxRetriesReached: 'FETCH'
  }
  eventsCausingDelays: {}
  matchesStates:
    | 'idle'
    | 'errored'
    | 'fetching'
    | 'editing'
    | 'editing.idle'
    | 'editing.debouncing'
    | 'editing.saving'
    | 'editing.publishing'
    | 'editing.published'
    | 'finishEditing'
    | 'failed'
    | {editing?: 'idle' | 'debouncing' | 'saving' | 'publishing' | 'published'}
  tags: 'saving'
}
