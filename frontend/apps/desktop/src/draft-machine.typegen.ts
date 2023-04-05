
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
    '@@xstate/typegen': true
    internalEvents: {
      'done.invoke.fetchDraft': {
        type: 'done.invoke.fetchDraft'
        data: unknown
        __tip: 'See the XState TS docs to learn how to strongly type this.'
      }
      'done.invoke.publishDraft': {
        type: 'done.invoke.publishDraft'
        data: unknown
        __tip: 'See the XState TS docs to learn how to strongly type this.'
      }
      'done.invoke.saveDraft': {
        type: 'done.invoke.saveDraft'
        data: unknown
        __tip: 'See the XState TS docs to learn how to strongly type this.'
      }
      'error.platform.fetchDraft': {
        type: 'error.platform.fetchDraft'
        data: unknown
      }
      'error.platform.publishDraft': {
        type: 'error.platform.publishDraft'
        data: unknown
      }
      'error.platform.saveDraft': {
        type: 'error.platform.saveDraft'
        data: unknown
      }
      'xstate.init': {type: 'xstate.init'}
    }
    invokeSrcNameMap: {
      fetchDraft: 'done.invoke.fetchDraft'
      publishDraft: 'done.invoke.publishDraft'
      saveDraft: 'done.invoke.saveDraft'
    }
    missingImplementations: {
      actions: 'afterPublish'
      delays: never
      guards: 'isDaemonReady'
      services: 'publishDraft'
    }
    eventsCausingActions: {
      afterPublish: 'done.invoke.publishDraft'
      assignCanSave: 'IS_DAEMON_READY'
      assignCannotSave: 'DRAFT.COMMIT.SAVE'
      assignDraft: 'done.invoke.fetchDraft' | 'done.invoke.saveDraft'
      assignError:
        | 'error.platform.fetchDraft'
        | 'error.platform.publishDraft'
        | 'error.platform.saveDraft'
      assignLocalDraft: 'done.invoke.fetchDraft'
      assignTitle: 'done.invoke.fetchDraft'
      cancelSave: 'DRAFT.PUBLISH' | 'DRAFT.UPDATE' | 'RESET.CHANGES'
      commitSave: 'DRAFT.UPDATE'
      invalidateDraft: 'done.invoke.publishDraft' | 'done.invoke.saveDraft'
      resetChanges: 'RESET.CHANGES' | 'done.invoke.saveDraft'
      updateTitle: 'DRAFT.UPDATE'
      updateValueToContext: 'DRAFT.UPDATE'
    }
    eventsCausingDelays: {}
    eventsCausingGuards: {
      isDaemonReady: 'DRAFT.COMMIT.SAVE'
    }
    eventsCausingServices: {
      fetchDraft: 'RETRY' | 'xstate.init'
      publishDraft: 'DRAFT.PUBLISH' | 'done.invoke.saveDraft'
      saveDraft: 'DRAFT.COMMIT.SAVE' | 'DRAFT.PUBLISH'
    }
    matchesStates:
      | 'editing'
      | 'editing.idle'
      | 'editing.saving'
      | 'errored'
      | 'fetching'
      | 'publish'
      | 'publish.published'
      | 'publish.publishing'
      | 'publish.saving'
      | {
          editing?: 'idle' | 'saving'
          publish?: 'published' | 'publishing' | 'saving'
        }
    tags: 'saving'
  }
  