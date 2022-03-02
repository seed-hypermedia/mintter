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
    clearLinks: 'PUBLICATION.FETCH.DATA' | 'TOGGLE.DISCUSSION'
    clearDiscussion: 'PUBLICATION.FETCH.DATA' | 'TOGGLE.DISCUSSION'
    clearError: 'PUBLICATION.FETCH.DATA' | 'TOGGLE.DISCUSSION'
  }
  internalEvents: {
    '': {type: ''}
    'xstate.init': {type: 'xstate.init'}
    'done.invoke.fetchDiscussionData': {
      type: 'done.invoke.fetchDiscussionData'
      data: unknown
      __tip: 'See the XState TS docs to learn how to strongly type this.'
    }
    'error.platform.fetchDiscussionData': {type: 'error.platform.fetchDiscussionData'; data: unknown}
  }
  invokeSrcNameMap: {
    fetchPublicationData: 'done.invoke.publication-machine.fetching:invocation[0]'
    fetchDiscussionData: 'done.invoke.fetchDiscussionData'
  }
  missingImplementations: {
    actions: never
    services: 'fetchPublicationData' | 'fetchDiscussionData'
    guards: never
    delays: never
  }
  eventsCausingServices: {
    fetchPublicationData: 'PUBLICATION.FETCH.DATA'
    fetchDiscussionData: '' | 'TOGGLE.DISCUSSION'
  }
  eventsCausingGuards: {
    isDiscussionFetched: ''
  }
  eventsCausingDelays: {}
  matchesStates:
    | 'idle'
    | 'fetching'
    | 'ready'
    | 'discussion'
    | 'discussion.idle'
    | 'discussion.fetching'
    | 'discussion.ready'
    | 'discussion.errored'
    | 'discussion.finish'
    | 'errored'
    | {discussion?: 'idle' | 'fetching' | 'ready' | 'errored' | 'finish'}
  tags: never
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
