// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignId: 'PUBLICATION.FETCH.DATA'
    assignVersion: 'PUBLICATION.FETCH.DATA'
    assignPublication: 'PUBLICATION.REPORT.SUCCESS'
    assignCanUpdate: 'PUBLICATION.REPORT.SUCCESS'
    assignError: 'PUBLICATION.REPORT.ERROR' | 'REPORT.DISCUSSION.ERROR'
    assignLinks: 'REPORT.DISCUSSION.SUCCESS'
    assignDiscussion: 'REPORT.DISCUSSION.SUCCESS'
    clearLinks: 'PUBLICATION.FETCH.DATA'
    clearDiscussion: 'PUBLICATION.FETCH.DATA'
    clearError: 'PUBLICATION.FETCH.DATA'
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
    | 'fetching'
    | 'ready'
    | 'discussion'
    | 'discussion.idle'
    | 'discussion.fetching'
    | 'discussion.ready'
    | 'discussion.finish'
    | 'errored'
    | {discussion?: 'idle' | 'fetching' | 'ready' | 'finish'}
  tags: 'pending'
}
export interface Typegen1 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignLink: 'FETCH'
    assignPublication: 'REPORT.FETCH.SUCCESS'
    assignBlock: 'REPORT.FETCH.SUCCESS'
    assignError: 'REPORT.FETCH.ERROR'
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
  matchesStates: 'idle' | 'fetching' | 'errored' | 'ready'
  tags: 'pending'
}
