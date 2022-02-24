// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    displayFailedMessage: 'FETCH'
    incrementRetries: 'FETCH'
    assignDraftsValue: 'EDITOR.REPORT.FETCH.SUCCESS'
    assignError: 'EDITOR.REPORT.FETCH.ERROR' | 'EDITOR.UPDATE.ERROR' | 'EDITOR.PUBLISH.ERROR'
    updateValueToContext: 'EDITOR.UPDATE'
    assignErrorToContext: 'error.platform.editor.editing.saving:invocation[0]'
    updateLibrary: 'EDITOR.UPDATE.SUCCESS'
    assignPublication: 'EDITOR.PUBLISH.SUCCESS'
    afterPublish: 'done.state.editing'
  }
  internalEvents: {
    'error.platform.editor.editing.saving:invocation[0]': {
      type: 'error.platform.editor.editing.saving:invocation[0]'
      data: unknown
    }
    'xstate.after(1000)#editor.editing.debouncing': {type: 'xstate.after(1000)#editor.editing.debouncing'}
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {}
  missingImplementations: {
    actions: 'displayFailedMessage' | 'assignErrorToContext' | 'afterPublish'
    services: never
    guards: never
    delays: never
  }
  eventsCausingServices: {}
  eventsCausingGuards: {
    isValueDirty: 'xstate.after(1000)#editor.editing.debouncing'
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
  tags: never
}
