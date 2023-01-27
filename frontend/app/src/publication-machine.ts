import {
  Account,
  createDraft,
  Document,
  getAccount,
  getInfo,
  getPublication,
  Publication,
  blockNodeToSlate,
  GroupingContent,
} from '@mintter/shared'
import {EditorDocument} from '@app/draft-machine'
import {queryKeys} from '@app/hooks'
import {openWindow} from '@app/utils/open-window'
import {QueryClient} from '@tanstack/react-query'
import {invoke} from '@tauri-apps/api'
import {assign, createMachine, InterpreterFrom} from 'xstate'

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
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAjANgSwMYEMAXbAewDsBaAW31wAtsywA6CbWXVWWUs57CJjABiADIB5AIIARRChI9i5OSAAeiAIwA2AKzMtAFh0AOAEw6txjQGZTATmsGANCACeiazoDszL9Y1eWgAMdjrWdhqmGgC+0S5oWHhEvNS0DEys7JzcvMwAZmCE9IxQwtIAkgDKAMIAqpWV5eIAcswASgCiAAribQAqzB1tbb0qyArYSmQq6gg6QVrMdn4Rxo4adqaezm6IXl56wVoHBkamxjo6MXEgCTgEU6nFGWwcXDzk+YXPpRU19Y0Wu1ur0BpVatVqh0GmMJlMZoh5otluENGsDBstjodu4EMYtBpmFdrEENEFTF4ySZTLF4hh7slyE90ixXtkPnwAE5gfAQVzMBgQCBgMhlKp1BpNVqVAAS4gA6rDFLwEQhQot5ld5kEDKZTEYXLiyVtmOsNAZHBcNBsvLTbvSko8aM9WVl3rlubz+YLhaK-hLAa0+uIAOIh0QdJWTFVINSIOwY016i744xBEnaQ2IYxeOxE866WzWY5BHQ0m53R0pZ0szJvHKfT185gAN3Y2CwIn9AKlzBl5Wkkdj42VyljswThNs5xMlnTpK0WbVFOYBi0BIMdjs+ICxztlYe1bSjFd9Y5zCb-LbPE7Yv+kqBwbDEaj8PH8cT05Tc4zi92aoOVd00MY5PEMMx9wdQ8mRrE863ZD0eT5YRamaCQZFfGNQFmHMl2WHw7GArRzACUs9UgxJoMoWCXjdBs+DATlORIbkIDvANewAMQ6PpqhlZhpEkPpJEwsdsMRBYlhWNF1k2bYly8Fd102bwvHTaw1ltCsoMZajjwyA9dP4QQRHQ2RhzhLC4wQTdCRRVZZKxHFNAJQkLmU45ziCKwdAohknX0lhDKmYyhGELpOm43iZVE6Z3wQWwk2I0lCK8Wy7D-I15h8Uwji2LYFlJa46Uo3TmTg4LckY5jWPC2oACFRHKaohK4ni+IEoSRIs0c4vEuZrGsJZzQWNLjhMLwl0iDZmH1NKFn8NYyy0kr-KPF1mEqz4CiKdJSi6Bqmpavpe06Hp+mYcFIWhSpYtVWypNRdFMXk-9zVMIJmB1XVDAMSlwnOPyqxgwLNp0kKdp+OrGua1qgTO0FBmGUYeujMTrIe+yZIxOTsSmwaDGYGw028ws0WWIGqPKgzwcQr0ULQqRzPkXrVXXIa-ACXL01y-FrCmiwhoiYWty8fEQjsSmypokQIHIFhGBbEgAGsWEhuhJFQQg6BYu74p0Bwkw0bx7ATYs8f-A2lmsNKMttv7zWMKWApdYRqpYzbMCIPIWKoL5ds17XddRt9+oNwnggxS5Qg++xjCm8sbjIEhhXgYdaZBja2XdT4BCEPX+v2Jdizc-YJpJIJFLSgxnfW2ts-o-2fgL6zjQUzcie80tjGMP7vA2WvM-rujz0vAUBF9FvZmtYivt0dMVg0j6NDw85Zr+3VcwsYwHGsQe9Kzke6eba8O3zkOrJwtEvuxLRBu0avAiXHuCOAgw1gTSx8X36nTwQxskK4hZmjPq1lcyE1LGue+xxThP3-GmHw0cHBmHCCSSkP8ZbwRzgxJiLFIBTz2JYXwalczuRzMEeO-5ObMB8iEC4CwN4YNBg3DkBCBpLhnL4Yi25NwUgcNaGu2lSou1rFtPgecwBsMxElZeqV0qZU0PMQkFJiK6E5oRciQi1pDwqhnHBNV8EX3RrMMWn1jhojCGWHUGx+ZvXMIsfEywLhGDFkiJhG0xFNz2mwoudjwizQfhcRS6Ye6+S0cDA+oi9EXkAT4tM+hKQXE8B9HGtisomCAsk8kY1vLFXtMIuuuiCnoxHCA1UxgZEpUrvI5yCABE5VcYYCwmwUHuJZGwigxsEk223CEcwXdixTVnr3YsakPo9PJLEWIQA */
  return createMachine(
    {
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
      predictableActionArguments: true,
      id: 'publication-machine',
      type: 'parallel',
      entry: ['sendActorToParent'],
      states: {
        publication: {
          initial: 'fetching',
          states: {
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
              invoke: {
                src: 'fetchAuthor',
                id: 'fetchAuthor',
                onDone: [
                  {
                    actions: 'assignAuthor',
                  },
                ],
                onError: [{}],
              },
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
          },
        },
        discussion: {
          initial: 'ready',
          states: {
            ready: {
              tags: 'ready',
              initial: 'visible',
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
            errored: {},
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
          links: [],
        }),
        // @ts-ignore
        clearError: assign({
          errorMessage: '',
        }),
        openWindow: (context, event) => {
          openWindow(
            `/d/${event.data.id}?replyto=${context.documentId}/${context.version}`,
          )
        },
        refetchDraftList: () => {
          invoke('emit_all', {
            event: 'new_draft',
          })
        },
        // prefetchPublication: (context) => {
        //   client.prefetchQuery(
        //     [
        //       queryKeys.GET_PUBLICATION,
        //       context.publication?.document?.id,
        //       context.publication?.version,
        //     ],
        //     () =>
        //       getPublication(
        //         context.publication?.document?.id,
        //         context.publication?.version,
        //       ),
        //     {
        //       staleTime: 10 * 1000, // only prefetch if older than 10 seconds
        //     },
        //   )
        // },
      },
    },
  )
}
