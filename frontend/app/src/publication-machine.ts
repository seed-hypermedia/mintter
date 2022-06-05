import {
  getInfo,
  getPublication,
  listCitations, Publication
} from '@app/client'
import { blockNodeToSlate } from '@app/client/v2/block-to-slate'
import { EditorDocument } from '@app/editor/use-editor-draft'
import { queryKeys } from '@app/hooks'
import { getBlock, GetBlockResult } from '@app/utils/get-block'
import { QueryClient } from 'react-query'
import { assign, createMachine, sendParent } from 'xstate'

export type ClientPublication = Omit<Publication, 'document'> & {
  document: EditorDocument
}

export type PublicationContext = {
  docId: string
  version: string
  publication: ClientPublication | null
  errorMessage: string
  canUpdate: boolean
  discussion: Array<GetBlockResult>
}

export type PublicationEvent =
  { type: 'LOAD' }
  | { type: 'UNLOAD' }
  | { type: 'PUBLICATION.FETCH.DATA' }
  | {
    type: 'PUBLICATION.REPORT.SUCCESS'
    publication: ClientPublication
    canUpdate?: boolean
  }
  | { type: 'PUBLICATION.REPORT.ERROR'; errorMessage: string }
  | { type: 'DISCUSSION.FETCH.DATA' }
  | { type: 'DISCUSSION.SHOW' }
  | { type: 'DISCUSSION.HIDE' }
  | { type: 'DISCUSSION.TOGGLE' }
  | { type: 'DISCUSSION.REPORT.SUCCESS'; discussion: Array<GetBlockResult> }
  | { type: 'DISCUSSION.REPORT.ERROR'; errorMessage: string }

export function createPublicationMachine(client: QueryClient, publication: Publication) {
  return createMachine(
    {
      context: {
        docId: publication.document!.id,
        version: publication.version,
        publication: null,
        errorMessage: '',
        canUpdate: false,
        discussion: [],
      },
      tsTypes: {} as import('./publication-machine.typegen').Typegen0,
      schema: { context: {} as PublicationContext, events: {} as PublicationEvent },
      type: 'parallel',
      id: 'publication-machine',
      states: {
        discussion: {
          initial: 'idle',
          states: {
            idle: {
              always: {
                target: 'fetching',
              },
            },
            fetching: {
              invoke: {
                src: 'fetchDiscussionData',
                id: 'fetchDiscussionData',
              },
              on: {
                'DISCUSSION.REPORT.ERROR': {
                  actions: 'assignError',
                  target: 'errored',
                },
                'DISCUSSION.REPORT.SUCCESS': {
                  actions: 'assignDiscussion',
                  target: 'ready',
                },
              },
            },
            ready: {
              initial: 'hidden',
              states: {
                hidden: {
                  on: {
                    'DISCUSSION.SHOW': {
                      target: 'visible',
                    },
                    'DISCUSSION.TOGGLE': {
                      target: 'visible',
                    },
                  },
                },
                visible: {
                  on: {
                    'DISCUSSION.HIDE': {
                      target: 'hidden',
                    },
                    'DISCUSSION.TOGGLE': {
                      target: 'hidden',
                    },
                  },
                },
              },
            },
            errored: {
              on: {
                'DISCUSSION.FETCH.DATA': {
                  target: 'fetching',
                },
              },
            },
          },
        },
        publication: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                LOAD: [
                  {
                    cond: 'isCached',
                    target: 'ready',
                  },
                  {
                    target: 'fetching',
                  },
                ],
              },
            },
            errored: {
              on: {
                'PUBLICATION.FETCH.DATA': {
                  actions: ['clearError', 'clearDiscussion'],
                  target: 'fetching',
                },
              },
            },
            fetching: {
              invoke: {
                src: 'fetchPublicationData',
                id: 'fetchPublicationData',
              },
              tags: 'pending',
              on: {
                'PUBLICATION.REPORT.SUCCESS': {
                  actions: ['assignPublication', 'assignCanUpdate'],
                  target: 'ready',
                },
                'PUBLICATION.REPORT.ERROR': {
                  actions: 'assignError',
                  target: 'errored',
                },
              },
            },
            ready: {
              on: {
                UNLOAD: {
                  target: 'idle',
                },
              },
            },
          },
        },
      },
    },
    {
      services: {
        fetchPublicationData: (context) => (sendBack) => {
          Promise.all([
            client.fetchQuery(
              [
                queryKeys.GET_PUBLICATION,
                context.docId,
                context.version,
              ],
              () =>
                getPublication(context.docId, context.version),
            ),
            client.fetchQuery([queryKeys.GET_ACCOUNT_INFO], () =>
              getInfo(),
            ),
          ])
            .then(([publication, info]) => {
              if (publication.document?.children.length) {
                sendParent({
                  type: 'SET.CURRENT.DOCUMENT',
                  document: publication.document,
                })
                let content = [
                  blockNodeToSlate(publication.document.children),
                ]

                sendBack({
                  type: 'PUBLICATION.REPORT.SUCCESS',
                  publication: Object.assign(publication, {
                    document: {
                      ...publication.document,
                      content,
                    },
                  }),
                  canUpdate:
                    info.accountId == publication.document.author,
                })
              } else {
                if (publication.document?.children.length == 0) {
                  sendBack({
                    type: 'PUBLICATION.REPORT.ERROR',
                    errorMessage: 'Content is Empty',
                  })
                } else {
                  sendBack({
                    type: 'PUBLICATION.REPORT.ERROR',
                    errorMessage: `error, fetching publication ${context.docId}`,
                  })
                }
              }
            })
            .catch((err) => {
              sendBack({
                type: 'PUBLICATION.REPORT.ERROR',
                errorMessage: 'error fetching',
              })
            })
        },
        fetchDiscussionData: (context) => (sendBack) => {
          if (context.docId) {
            client
              .fetchQuery(
                [
                  queryKeys.GET_PUBLICATION_DISCUSSION,
                  context.docId,
                  context.version,
                ],
                () => {
                  return listCitations(context.docId)
                },
              )
              .then((response) => {
                let links = response.links.filter(Boolean)

                // This is importat to make citations accessible to Editor elements

                Promise.all(
                  links.map(({ source }) => getBlock(source)),
                )
                  //@ts-ignore
                  .then((result: Array<GetBlockResult>) => {
                    sendBack({
                      type: 'DISCUSSION.REPORT.SUCCESS',
                      discussion: result,
                    })
                  })
              })
              .catch((error: any) => {
                sendBack({
                  type: 'DISCUSSION.REPORT.ERROR',
                  errorMessage: `Error fetching Discussion: ${error.message}`,
                })
              })
          } else {
            sendBack({
              type: 'DISCUSSION.REPORT.ERROR',
              errorMessage: `Error fetching Discussion: No docId found: ${pub}`,
            })
          }
        },
      },
      guards: {
        isCached: () => false,
      },
      actions: {
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        assignCanUpdate: assign({
          canUpdate: (_, event) => Boolean(event.canUpdate),
        }),
        assignDiscussion: assign({
          discussion: (_, event) => event.discussion,
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        clearDiscussion: assign({
          discussion: (context) => null,
        }),
        clearError: assign({
          errorMessage: (context) => '',
        }),
      },
    },
  )
}