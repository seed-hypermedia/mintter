// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignError: 'REPORT.SIDEPANEL.ERROR'
    assignSidepanelItems: 'REPORT.SIDEPANEL.SUCCESS'
    addItemToSidepanel: 'SIDEPANEL.ADD'
    persist: 'SIDEPANEL.ADD' | 'SIDEPANEL.REMOVE' | 'SIDEPANEL.CLEAR'
    removeItemFromSidepanel: 'SIDEPANEL.REMOVE'
    clearItems: 'SIDEPANEL.CLEAR'
  }
  internalEvents: {
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {}
  missingImplementations: {
    actions: never
    services: never
    guards: never
    delays: never
  }
  eventsCausingServices: {}
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates:
    | 'idle'
    | 'errored'
    | 'ready'
    | 'ready.closed'
    | 'ready.opened'
    | {ready?: 'closed' | 'opened'}
  tags: never
}
export interface Typegen1 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignPublication: 'REPORT.SIDEPANEL.ITEM.SUCCESS'
    assignAuthor: 'REPORT.SIDEPANEL.ITEM.SUCCESS'
    assignBlock: 'REPORT.SIDEPANEL.ITEM.SUCCESS'
    assignError: 'REPORT.SIDEPANEL.ITEM.ERROR'
    clearError: 'RETRY'
  }
  internalEvents: {
    'xstate.init': {type: 'xstate.init'}
    'done.invoke.fetchItemData': {
      type: 'done.invoke.fetchItemData'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.fetchItemData': {
      type: 'error.platform.fetchItemData'
      data: unknown
    }
  }
  invokeSrcNameMap: {
    fetchItemData: 'done.invoke.fetchItemData'
  }
  missingImplementations: {
    actions: never
    services: never
    guards: never
    delays: never
  }
  eventsCausingServices: {
    fetchItemData: 'RETRY'
  }
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates: 'loading' | 'errored' | 'expanded' | 'collapsed'
  tags: never
}
