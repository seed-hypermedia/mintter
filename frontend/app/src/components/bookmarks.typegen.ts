// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    clearBookmarkList: 'BOOKMARK.CLEARALL'
    persist: 'BOOKMARK.CLEARALL' | 'BOOKMARK.ADD' | 'BOOKMARK.REMOVE'
    assignBookmarkList: 'REPORT.BOOKMARKS.SUCCESS'
    assignError: 'REPORT.BOOKMARKS.ERROR'
    addBookmark: 'BOOKMARK.ADD'
    removeBookmark: 'BOOKMARK.REMOVE'
  }
  internalEvents: {
    'xstate.init': {type: 'xstate.init'}
    'done.invoke.bookmarks-fetch': {
      type: 'done.invoke.bookmarks-fetch'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.bookmarks-fetch': {
      type: 'error.platform.bookmarks-fetch'
      data: unknown
    }
  }
  invokeSrcNameMap: {
    fetchBookmarkList: 'done.invoke.bookmarks-fetch'
  }
  missingImplementations: {
    actions: never
    services: never
    guards: never
    delays: never
  }
  eventsCausingServices: {
    fetchBookmarkList: 'BOOKMARK.RESET'
  }
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates: 'loading' | 'ready' | 'errored'
  tags: never
}
export interface Typegen1 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignBookmark: 'REPORT.BOOKMARK.ITEM.SUCCESS'
    assignError: 'REPORT.BOOKMARK.ITEM.ERROR'
    clearError: 'RETRY'
    removeBookmark: 'BOOKMARK.ITEM.DELETE'
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
  matchesStates: 'loading' | 'errored' | 'idle'
  tags: never
}
