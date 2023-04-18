import {
  accountsClient,
  draftsClient,
  publicationsClient,
} from '@app/api-clients'
import {EditorDocument} from '@app/draft-machine'
import {queryKeys} from '@app/models/query-keys'
import {
  Account,
  blockNodeToSlate,
  Document,
  group,
  paragraph,
  Publication,
  statement,
  text,
} from '@mintter/shared'
import {QueryClient} from '@tanstack/react-query'
import {assign, createMachine, InterpreterFrom} from 'xstate'
import {fetchDaemonInfo} from './models/daemon'
import {appInvalidateQueries} from './query-client'

export type ClientPublication = Omit<Publication, 'document'> & {
  document: EditorDocument
}

export type PublicationMachineContext = {
  documentId: string
  version: string
  author: Account | null
  publication: ClientPublication | null
  errorMessage: string
  canUpdate: boolean
  title: string
}

export type PublicationMachineEvent =
  | {type: 'PUBLICATION.FETCH.DATA'}
  | {
      type: 'PUBLICATION.REPORT.SUCCESS'
      publication: ClientPublication
      canUpdate?: boolean
    }
  | {type: 'PUBLICATION.REPORT.ERROR'; errorMessage: string}
  | {type: 'DISCUSSION.SHOW'}
  | {type: 'DISCUSSION.HIDE'}
  | {type: 'PANEL.TOGGLE'}
  | {type: 'FILE.DELETE.OPEN'}
  | {type: 'FILE.DELETE.CLOSE'}
  | {type: 'FILE.DELETE.CANCEL'}
  | {type: 'FILE.DELETE.CONFIRM'}
  | {type: 'PUBLICATION.EDIT'}

type PublicationMachineServices = {
  createDraft: {
    data: Document
  }
}

type CreatePublicationMachineProps = {
  client: QueryClient
  documentId: string
  version: string
}

export type PublicationActor = InterpreterFrom<
  ReturnType<typeof createPublicationMachine>
>

export function createPublicationMachine({
  client,
  documentId,
  version,
}: CreatePublicationMachineProps) {
  return createMachine(
    {
      predictableActionArguments: true,
      context: {
        title: '',
        documentId,
        version,
        publication: null,
        author: null,
        errorMessage: '',
        canUpdate: false,
      },
      tsTypes: {} as import("./publication-machine.typegen").Typegen0,
      schema: {
        context: {} as PublicationMachineContext,
        events: {} as PublicationMachineEvent,
        services: {} as PublicationMachineServices,
      },
      id: 'publication-machine',
      initial: 'fetching',
      states: {
        fetching: {
          invoke: {
            src: 'fetchPublicationData',
            id: 'fetchPublicationData',
          },
          tags: 'pending',
          initial: 'normal',
          states: {
            normal: {
              after: {
                1000: 'extended',
              },
            },
            extended: {},
          },
          on: {
            'PUBLICATION.REPORT.SUCCESS': {
              actions: [
                'assignPublication',
                'assignCanUpdate',
                'assignTitle',
                () => {
                  appInvalidateQueries([queryKeys.GET_PUBLICATION_LIST])
                },
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
          invoke: [
            {
              src: 'fetchAuthor',
              id: 'fetchAuthor',
              onDone: {
                actions: 'assignAuthor',
              },
            },
            // {
            //   src: 'fetchConversations',
            //   id: 'fetchConversations',
            //   onDone: {
            //     actions: ['applyConversations'],
            //   },
            // },
          ],
          initial: 'idle',
          states: {
            idle: {
              on: {
                'PUBLICATION.EDIT': 'editing',
              },
            },
            editing: {
              invoke: {
                id: 'createDraft',
                src: 'createDraft',
                onDone: {
                  actions: ['onEditSuccess'],
                },
                onError: [
                  {
                    actions: ['assignError'],
                    target: 'idle',
                  },
                ],
              },
            },
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
      },
    },
    {
      services: {
        createDraft: (context) => {
          return draftsClient.createDraft({
            existingDocumentId: context.documentId,
          })
        },
        fetchAuthor: (context) => {
          let author = context.publication?.document?.author || ''
          return client.fetchQuery([queryKeys.GET_ACCOUNT, author], () =>
            accountsClient.getAccount({id: author}),
          )
        },
        fetchPublicationData: (context) => (sendBack) => {
          Promise.all([
            client.fetchQuery(
              [queryKeys.GET_PUBLICATION, context.documentId, context.version],
              () =>
                publicationsClient.getPublication({
                  documentId: context.documentId,
                  version: context.version,
                }),
              {
                staleTime: Infinity,
              },
            ),
            fetchDaemonInfo(),
          ])
            .then(([publication, info]) => {
              if (publication.document?.children.length) {
                // TODO: use the parent list type instead

                // let mixedContent = applySelectors({
                //   publication,
                //   conversations,
                // })

                let content = blockNodeToSlate(
                  publication.document.children,
                  'group',
                )
                sendBack({
                  type: 'PUBLICATION.REPORT.SUCCESS',
                  publication: Object.assign(publication, {
                    document: {
                      ...publication.document,
                      content: [content],
                    },
                  }),
                  canUpdate: info?.accountId == publication.document.author,
                })
              } else {
                if (publication.document?.children.length == 0) {
                  sendBack({
                    type: 'PUBLICATION.REPORT.SUCCESS',
                    publication: Object.assign(publication, {
                      document: {
                        ...publication.document,
                        content: [
                          group({data: {parent: ''}}, [
                            statement({id: ''}, [paragraph([text('')])]),
                          ]),
                        ],
                      },
                    }),
                    canUpdate: info?.accountId == publication.document.author,
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
      },
      actions: {
        assignTitle: assign({
          title: (_, event) =>
            event.publication.document.title || 'Untitled Document',
        }),
        assignAuthor: assign({
          author: (_, event) => event.data as Account,
        }),
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        assignCanUpdate: assign({
          canUpdate: (_, event) => Boolean(event.canUpdate),
        }),
        assignError: assign({
          errorMessage: (_, event) => {
            if (event.type == 'error.platform.createDraft') {
              return JSON.stringify(event.data)
            } else {
              return event.errorMessage
            }
          },
        }),
        // @ts-ignore
        clearLinks: assign({
          links: () => [],
        }),
        // @ts-ignore
        clearError: assign({
          errorMessage: () => '',
        }),
      },
    },
  )
}
