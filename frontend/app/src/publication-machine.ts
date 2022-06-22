import {
  Account,
  getAccount,
  getInfo,
  getPublication,
  Link,
  listCitations,
  Publication,
} from '@app/client'
import {blockNodeToSlate} from '@app/client/v2/block-to-slate'
import {EditorDocument} from '@app/draft-machine'
import {queryKeys} from '@app/hooks'
import {QueryClient} from 'react-query'
import {Editor} from 'slate'
import {assign, createMachine} from 'xstate'

export type ClientPublication = Omit<Publication, 'document'> & {
  document: EditorDocument
}

export type PublicationContext = {
  documentId: string
  version: string
  author: Account | null
  publication: Publication | ClientPublication | null
  errorMessage: string
  canUpdate: boolean
  links: Array<Link>
  editor: Editor
  title: string
}

export type PublicationEvent =
  | {type: 'LOAD'}
  | {type: 'UNLOAD'}
  | {type: 'PUBLICATION.FETCH.DATA'}
  | {
      type: 'PUBLICATION.REPORT.SUCCESS'
      publication: ClientPublication
      canUpdate?: boolean
    }
  | {type: 'PUBLICATION.REPORT.ERROR'; errorMessage: string}
  | {type: 'PUBLICATION.REPORT.AUTHOR.ERROR'; errorMessage: string}
  | {type: 'PUBLICATION.REPORT.AUTHOR.SUCCESS'; author: Account}
  | {type: 'DISCUSSION.FETCH.DATA'}
  | {type: 'DISCUSSION.SHOW'}
  | {type: 'DISCUSSION.HIDE'}
  | {type: 'DISCUSSION.TOGGLE'}
  | {type: 'DISCUSSION.REPORT.SUCCESS'; links: Array<Link>}
  | {type: 'DISCUSSION.REPORT.ERROR'; errorMessage: string}
  | {type: 'FILE.DELETE.OPEN'}
  | {type: 'FILE.DELETE.CLOSE'}
  | {type: 'FILE.DELETE.CANCEL'}
  | {type: 'FILE.DELETE.CONFIRM'}

type CreatePublicationProps = {
  client: QueryClient
  publication: Publication
  editor: Editor
}

export function createPublicationMachine({
  client,
  publication,
  editor,
}: CreatePublicationProps) {
  return createMachine(
    {
      context: {
        title: publication.document!.title,
        documentId: publication.document!.id,
        version: publication.version,
        editor,
        publication,
        author: null,
        links: [],
        errorMessage: '',
        canUpdate: false,
      },
      tsTypes: {} as import('./publication-machine.typegen').Typegen0,
      schema: {
        context: {} as PublicationContext,
        events: {} as PublicationEvent,
      },
      type: 'parallel',
      id: 'publication-machine',
      invoke: {
        src: 'fetchAuthor',
        id: 'fetchAuthor',
      },
      on: {
        'PUBLICATION.REPORT.AUTHOR.SUCCESS': {
          actions: ['assignAuthor'],
        },
      },
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
                  actions: 'assignLinks',
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
                  actions: ['clearError', 'clearLinks'],
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
                  actions: [
                    'assignPublication',
                    'assignCanUpdate',
                    'assignTitle',
                  ],
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
        fetchAuthor: (context) => (sendBack) => {
          let author = context.publication?.document?.author || ''
          if (author) {
            client
              .fetchQuery([queryKeys.GET_ACCOUNT, author], () =>
                getAccount(author),
              )
              .then((author) => {
                sendBack({
                  type: 'PUBLICATION.REPORT.AUTHOR.SUCCESS',
                  author,
                })
              })
              .catch((err) => {
                sendBack({
                  type: 'PUBLICATION.REPORT.AUTHOR.ERROR',
                  errorMessage: `fetchAuthor ERROR: ${JSON.stringify(err)}`,
                })
              })
          }
        },
        fetchPublicationData: (context) => (sendBack) => {
          Promise.all([
            client.fetchQuery(
              [
                queryKeys.GET_PUBLICATION,
                context.publication?.document?.id,
                context.publication?.version,
              ],
              () =>
                getPublication(
                  context.publication!.document!.id!,
                  context.publication!.version,
                ),
            ),
            client.fetchQuery([queryKeys.GET_ACCOUNT_INFO], () => getInfo()),
          ])
            .then(([publication, info]) => {
              if (publication.document?.children.length) {
                // TODO: use the parent list type instead
                let content = [
                  blockNodeToSlate(publication.document.children, 'group'),
                ]
                sendBack({
                  type: 'PUBLICATION.REPORT.SUCCESS',
                  publication: Object.assign(publication, {
                    document: {
                      ...publication.document,
                      content,
                    },
                  }),
                  canUpdate: info.accountId == publication.document.author,
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
                    errorMessage: `error, fetching publication ${context.publication?.document?.id}`,
                  })
                }
              }
            })
            .catch((err) => {
              sendBack({
                type: 'PUBLICATION.REPORT.ERROR',
                errorMessage: `error fetching publication: ${err}`,
              })
            })
        },
        fetchDiscussionData: (context) => (sendBack) => {
          if (context.publication?.document?.id) {
            client
              .fetchQuery(
                [
                  queryKeys.GET_PUBLICATION_DISCUSSION,
                  context.publication.document.id,
                  context.publication.version,
                ],
                () => {
                  return listCitations(context.publication!.document!.id!)
                },
              )
              .then((response) => {
                let links = response.links.filter(
                  (link) =>
                    typeof link.source != 'undefined' &&
                    typeof link.target != 'undefined',
                )

                sendBack({
                  type: 'DISCUSSION.REPORT.SUCCESS',
                  links,
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
        assignTitle: assign({
          title: (_, event) =>
            event.publication.document.title || 'Untitled Document',
        }),
        assignAuthor: assign({
          author: (_, event) => event.author,
        }),
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        assignCanUpdate: assign({
          canUpdate: (_, event) => Boolean(event.canUpdate),
        }),
        assignLinks: assign({
          links: (_, event) => event.links,
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        clearLinks: assign({
          links: (context) => [],
        }),
        clearError: assign({
          errorMessage: (context) => '',
        }),
      },
    },
  )
}
