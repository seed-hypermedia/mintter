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
import {QueryClient} from '@tanstack/react-query'
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
  dedupeLinks: Array<Link>
  editor: Editor
  title: string
}

export type PublicationEvent =
  | {type: 'LOAD'}
  | {type: 'UNLOAD'}
  | {type: 'PREFETCH'}
  | {type: 'PUBLICATION.FETCH.DATA'}
  | {
      type: 'PUBLICATION.REPORT.SUCCESS'
      publication: ClientPublication
      canUpdate?: boolean
    }
  | {type: 'PUBLICATION.REPORT.ERROR'; errorMessage: string}
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
  | {type: 'PUBLICATION.REPLY.TO'}

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
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAjANgSwMYEMAXbAewDsBaAW31wAtsywA6CbWXVWWUs57CJjABiADIB5AIIARRChI9i5OSAAeiAIwA2AKzMtAFh0AOAEw6txjQGZTATmsGANCACeiazoDszL9Y1eWgAMdjrWdhqmGgC+0S5oWHhEvNS0DEys7JzcvMwAZmCE9IxQwtIAkgDKAMIAqpWV5eIAcswASgCiAAribQAqzB1tbb0qyArYSmQq6gg6QVrMdn4Rxo4adqaezm6IXl56wVoHBkamxjo6MXEgCTgEU6nFGWwcXDzk+YXPpRU19Y0Wu1ur0BpVatVqh0GmMJlMZoh5otluENGsDBstjodu4EMYtBpmFdrEENEFTF4ySZTLF4hh7slyE90ixXtkPnwAE5gfAQVzMBgQCBgMhlKp1BpNVqVAAS4gA6rDFLwEQhQot5ld5kEDKZTEYXLiyVtmOsNAZHBcNBsvLTbvSko8aM9WVl3rlubz+YLhaK-hLAa0+uIAOIh0QdJWTFVINSIOwY016i744xBEnaQ2IYxeOxE866WzWY5BHQ0m53R0pZ0szJvHKfT185gAN3Y2CwIn9AKlzBl5Wkkdj42VyljswThNs5xMlnTpK0WbVFOYBi0BIMdjs+ICxztlYe1bSjFd9Y5zCb-LbPE7Yv+kqBwbDEaj8PH8cT05Tc4zi92aoOVd00MY5PEMMx9wdQ8mRrE863ZD0eT5YRamaCQZFfGNQFmHMl2WHw7GArRzACUs9UgxJoMoWCXjdBs+DATlORIbkIDvANewAMQ6PpqhlZhpEkPpJEwsdsMRBYlhWNF1k2bYly8Fd102bwvHTaw1ltCsoMZajjwyA9dP4QQRHQ2RhzhLC4wQTdCRRVZZKxHFNAJQkLmU45ziCKwdAohknX0lhDKmYyhGELpOm43iZVE6Z3wQWwk2I0lCK8Wy7D-I15h8Uwji2LYFlJa46Uo3TmTg4LckY5jWPC2oACFRHKaohK4ni+IEoSRIs0c4vEuZrGsJZzQWNLjhMLwl0iDZmH1NKFn8NYyy0kr-KPF1mEqz4CiKdJSi6Bqmpavpe06Hp+mYcFIWhSpYtVWypNRdFMXk-9zVMIJmB1XVDAMSlwnOPyqxgwLNp0kKdp+OrGua1qgTO0FBmGUYeujMTrIe+yZIxOTsSmwaDGYGw028ws0WWIGqPKgzwcQr0ULQqRzPkXrVXXIa-ACXL01y-FrCmiwhoiYWty8fEQjsSmypokQIHIFhGBbEgAGsWEhuhJFQQg6BYu74p0Bwkw0bx7ATYs8f-A2lmsNKMttv7zWMKWApdYRqpYzbMCIPIWKoL5ds17XddRt9+oNwnggxS5Qg++xjCm8sbjIEhhXgYdaZBja2XdT4BCEPX+v2Jdizc-YJpJIJFLSgxnfW2ts-o-2fgL6zjQUzcie80tjGMP7vA2WvM-rujz0vAUBF9FvZmtYivt0dMVg0j6NDw85Zr+3VcwsYwHGsQe9Kzke6eba8O3zkOrJwtEvuxLRBu0avAiXHuCOAgw1gTSx8X36nTwQxskK4hZmjPq1lcyE1LGue+xxThP3-GmHw0cHBmHCCSSkP8ZbwRzgxJiLFIBTz2JYXwalczuRzMEeO-5ObMB8iEC4CwN4YNBg3DkBCBpLhnL4Yi25NwUgcNaGu2lSou1rFtPgecwBsMxElZeqV0qZU0PMQkFJiK6E5oRciQi1pDwqhnHBNV8EX3RrMMWn1jhojCGWHUGx+ZvXMIsfEywLhGDFkiJhG0xFNz2mwoudjwizQfhcRS6Ye6+S0cDA+oi9EXkAT4tM+hKQXE8B9HGtisomCAsk8kY1vLFXtMIuuuiCnoxHCA1UxgZEpUrvI5yCABE5VcYYCwmwUHuJZGwigxsEk223CEcwXdixTVnr3YsakPo9PJLEWIQA */
  return createMachine(
    {
      context: {
        title: publication.document?.title ?? '',
        documentId: publication.document?.id ?? '',
        version: publication.version,
        editor,
        publication,
        author: null,
        links: [],
        dedupeLinks: [],
        errorMessage: '',
        canUpdate: false,
      },
      tsTypes: {} as import('./publication-machine.typegen').Typegen0,
      schema: {
        context: {} as PublicationContext,
        events: {} as PublicationEvent,
      },
      predictableActionArguments: true,
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
      id: 'publication-machine',
      type: 'parallel',
      states: {
        discussion: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                LOAD: {
                  target: 'fetching',
                },
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
              on: {
                UNLOAD: {
                  target: 'idle',
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
                PREFETCH: {
                  actions: ['prefetchPublication'],
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
        fetchAuthor: (context) => {
          let author = context.publication?.document?.author || ''
          return client.fetchQuery([queryKeys.GET_ACCOUNT, author], () =>
            getAccount(author),
          )
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
                  context.publication?.document?.id,
                  context.publication?.version,
                ),
              {
                staleTime: Infinity,
              },
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
                  if (context.publication?.document?.id) {
                    return listCitations(context.publication?.document?.id)
                  }

                  return null
                },
              )
              .then((response) => {
                let links = response
                  ? response.links.filter(
                      (link) =>
                        typeof link.source != 'undefined' &&
                        typeof link.target != 'undefined',
                    )
                  : []

                console.log('Discussion Links:', response)

                sendBack({
                  type: 'DISCUSSION.REPORT.SUCCESS',
                  links,
                })
              })
              .catch((error: unknown) => {
                sendBack({
                  type: 'DISCUSSION.REPORT.ERROR',
                  errorMessage: `Error fetching Discussion: ${JSON.stringify(
                    error,
                  )}`,
                })
              })
          } else {
            sendBack({
              type: 'DISCUSSION.REPORT.ERROR',
              errorMessage: `Error fetching Discussion: No docId found: ${context.publication?.document?.id}`,
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
          author: (_, event) => event.data as Account,
        }),
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        assignCanUpdate: assign({
          canUpdate: (_, event) => Boolean(event.canUpdate),
        }),
        assignLinks: assign((_, event) => {
          return {
            links: event.links,
            dedupeLinks: createDedupeLinks(event.links),
          }
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        // @ts-ignore
        clearLinks: assign({
          links: [],
        }),
        // @ts-ignore
        clearError: assign({
          errorMessage: '',
        }),
        prefetchPublication: (context) => {
          client.prefetchQuery(
            [
              queryKeys.GET_PUBLICATION,
              context.publication?.document?.id,
              context.publication?.version,
            ],
            () =>
              getPublication(
                context.publication?.document?.id,
                context.publication?.version,
              ),
            {
              staleTime: 10 * 1000, // only prefetch if older than 10 seconds
            },
          )
        },
      },
    },
  )
}

function createDedupeLinks(entry: Array<Link>): Array<Link> {
  let sourceSet = new Set<string>()

  return entry.filter((link) => {
    // this will remove any link with no source. maybe this is not possible?
    if (!link.source) return false

    let currentSource = `${link.source.documentId}/${link.source.version}`
    if (sourceSet.has(currentSource)) {
      return false
    } else {
      sourceSet.add(currentSource)
      return true
    }
  })
}
