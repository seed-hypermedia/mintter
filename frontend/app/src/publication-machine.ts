import {EditorDocument} from '@app/draft-machine'
import {queryKeys} from '@app/hooks'
import {
  Account,
  blockNodeToSlate,
  createDraft,
  Document,
  getAccount,
  getInfo,
  getPublication,
  group,
  paragraph,
  Publication,
  statement,
  text,
} from '@mintter/shared'
import {QueryClient} from '@tanstack/react-query'
import {assign, createMachine, InterpreterFrom, actions} from 'xstate'

let {send} = actions

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
  | {type: 'DISCUSSION.TOGGLE'}
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
  blockId?: string
}

export type PublicationActor = InterpreterFrom<
  ReturnType<typeof createPublicationMachine>
>

export function createPublicationMachine({
  client,
  documentId,
  version,
}: CreatePublicationMachineProps) {
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAjANgSwMYEMAXbAewDsBaAW31wAtsywA6AMzEPsagGIAFAKoAhADIBJAMIBBACpiA8gDlmAJQCifeSpnMAygIkS1u3QG0ADAF1EKErGzFyNkAA9EAFgCsn5gEYAHL7uvubuAJxhof6eADQgAJ6IAMwA7P5+-klJAGyeAExh7llBngC+pXFoWHhEpJQ0XExsHI28gqKSsgrK6prazGoqKloW1kggyHYOdc5uCF4+AUEh4ZHu0XGJCNnrzCm+IWEpeSme2Slh5ZUYOASO9bQMTeycT1DMZCQATjSYPC6wQhEFj4ViEMBfAAUIXM5gAlDwqrdauRqI9GCwXq0Pt9fqNnJN7PdZohfClsn4Ltl-OYwklfGdAklNohsr4Kbkcnlaf5wp5MlcJjcavc0Y0WF8wPgIPEeBByCxGAA3EgAa0xLToUlQhDo33x40J0yc4zmYX8FLC3iKR0CaVpLIQvjy6XcaSSeSC7jdKTS2UFSJFdTFTwlUplzGwEEwYH4wnE0jkSgGABExDIDbYiTNTYhoot3OdudkIu5zLEEohPOYUswwjtQsFPObeZcKkLqndgw1Q8xJdL4sxINMyLx5U1lWqWLh++CU19QYRMxMpsTc07fFlmNFPUlaScLRtKwgku48ntuTWDgVC54Uu4A8Ku6iexi++HB8PiKOeBCvt9mGQTAiFYXFmBnKU5wXMFlyNNdQDNWE9j3JIIkKLw8lSR0cnST1jm5JJ-DyTlfEfTsUQecUhy+f9JQgOMOkTbpmAAMTUGQJAACWYFNZCkWDVxzBCPG8DJllCCIogrLZ8g5WlnVSQpUn8cp20+CA4AJJ8KJDDECUEk1hIQCg8ncR0KB8c1YXLF0Dn8FIULI5FRVfZ5NW4fTs0M1xEFMx1C3PAJ7wZLI6QPf120DZ9KN7LE3hxH58EwTzjTIEkEGOR02R8HZPByWFIiyc4nKDF90Tc15uCHFxwTIDSIBS+CfIQApa2bfxCkiXJPGCIosoZZhcvy2lzCKlISui3Smn7GVGqE5r73MZhMNCUzzDyTDzmyR1uVwtl729Ubq3MCLrnIlzyrDAdI2jMA5u8uY0lwvczzLDacnJfy8uYMt8zdBkdmIspIu0i6qJmz8IBHKB7rS9cQjSbdzQuckNqtI8tkO5hq1Pe9qTWgoJp01yWD-b5IFh9KHLk8ImTpFYsuyCkTnyQiOr3Gk8lU0ogA */
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
      tsTypes: {} as import('./publication-machine.typegen').Typegen0,
      schema: {
        context: {} as PublicationMachineContext,
        events: {} as PublicationMachineEvent,
        services: {} as PublicationMachineServices,
      },
      id: 'publication-machine',
      entry: ['sendActorToParent'],
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
              actions: ['assignPublication', 'assignCanUpdate', 'assignTitle'],
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
        createDraft: (context, event) => {
          return createDraft(context.documentId)
        },
        fetchAuthor: (context) => {
          let author = context.publication?.document?.author || ''
          return client.fetchQuery([queryKeys.GET_ACCOUNT, author], () =>
            getAccount(author),
          )
        },
        fetchPublicationData: (context) => (sendBack) => {
          Promise.all([
            client.fetchQuery(
              [queryKeys.GET_PUBLICATION, context.documentId, context.version],
              () => getPublication(context.documentId, context.version),
              {
                staleTime: Infinity,
              },
            ),
            client.fetchQuery([queryKeys.GET_ACCOUNT_INFO], () => getInfo()),
          ])
            .then(([publication, info]) => {
              if (publication.document?.children.length) {
                // TODO: use the parent list type instead

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
                  canUpdate: info.accountId == publication.document.author,
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
                    canUpdate: info.accountId == publication.document.author,
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
