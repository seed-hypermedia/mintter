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
  dedupeLinks: Array<Link>
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
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAjANgSwMYEMAXbAewDsBaAW31wAtsywA6CbWXVWWUs57CJjABiRChI9i5MSAAeiAIwBOAGzMADJvUKAzAFYFCvUqV6ANCACeiACw2AHBq0KVO9QHYF6gEz2Avn4WaFh4RLzUtAxMrOyc3LzMAGZghPSMUMIAIgCSAMoAwgCqubnZAPIAcswASgCiAApl1QAqzLXV1U0yyBLYUmQy8gje3grMSjruNsYThgr27vYW1gg6uk6augZGJnoBQRg4BP0RadFsHFw85EkpZxk5BcWllTUNTa25hfn5tSXdvX6g0QC2WIOUzD0mwU3gMSk0Sm8+xAwSOYXIpyiLAucWufAATmB8BBLMwGBAIGAyFk8kUSuUqrkABJlADqAMkvGBCD0ejU8JU3hsOhs7k8ensSjBCHsOiUG3UJk0U0V7mRqNCJxoZ2xsSuCUJxNJ5Mp1MedJeVWaZQA4jaADK1Dl9LlIOSIXn89SC4Wi8WS6X2BYbGFQpQLKZIwIow6a8LarExS7xG6GknMABu7GwWBE5ueDOYTOymSdbp6nOkbqGEu8kKMKhcjZFUqsiAmehD23hugW6tjx3jkUYuuTeOYadJWZ4uZpT3pr2tdsdzqB1Y9fPG3qFIrFRgDbYQ7iUYy0Hm8J5U6mmOn7IUHGITI6TuISYHx+JIhIgc4thYAYrUzT5EyzCZAAgs04Grq6oBDN4ioaKYjYqDYqFyqh7jSnoaHMG4EpXiox58vYUYHPe6KUE+0Qag+fACEIwj2mU4GZDBVZwbYJ7jCYSoqPYLi8uYh5GL4CqSvxAp8neaJasONEDpRzDvp+37CPUhQAEL2tk+SQQBQEgWBkHQeWgKwe6PI6Do9Z8uoazaJK17SoYOh1s4iqwu4Ep9tGtGUZiz7+f0typFEGQadpun6a8dSNC0zBfD8fy5OxAzrggNjcbxfECSoQkudZnZnj2OHht4ap+Ypck6swwUJMkYXpOpWk6XpzSFnFHxtB0XRmZW6WcZl2U5d6eUFSJQqOM4ujTOo9jCkoMlxo+8ksPVqZEiSwiFBUzGsWl3IqFeGgNt4OhXiMDjeC5DjqAqrjGGK2jLXRgVMC1UXtZ17wJeBhTNCy1SJd8vz-P1LocZZRXMJ4CxCSemhES5UbRmQJCUvA5bVUOtU4vqNwMWAh0ZWK0p2O5WgikKWX7q9AXUaOr43I19wk0NejnRoNizcYV5rDC0oXe4sMqPCor2FeQbzXsVUUTVib4ymBJbcaAimuz0MTMw-FTBMSjCh4jbSse8oIcqgruN6WW3nLsm44rerKxOquZtmuaa0MYo2LDWXhm53hi0sh6yvKNjQnzRGqCo9MK8+SvjpOnuIBd8q6zbBtuO4xuHnDCo04ROEKLHDvx0744qV+kDJ0eWGHtZNmyg3C0SjYIzZyXq14+XFkVpDg2WXoOjSud8o5fl6h8ghpGy+R9td4mG30YIxMQ2uQ36CLOV7lbk8qLdAl4dZPNuToAmTGRMby6XCnXzclffjXYqdqoCwjAY82ynXKyGGLzBN3YY8DglBW0vkvd660cYszuOFJ+39FCiWYLCbQk9rYNyWnbFaVE1p1SgSrI0cCX663fl4IMkxbpTBDF4fKQ9w6VTnlgiBuC74Dz7uvQew8RKT3lM4MUvgjD2Vtgwt6jMa4XhckYHiJhs5WxPmQgIAQgA */
  return createMachine(
    {
      predictableActionArguments: true,
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
      invoke: {
        src: 'fetchAuthor',
        id: 'fetchAuthor',
      },
      type: 'parallel',
      id: 'publication-machine',
      on: {
        'PUBLICATION.REPORT.AUTHOR.SUCCESS': {
          actions: 'assignAuthor',
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
                  context.publication?.document?.id,
                  context.publication?.version,
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
          author: (_, event) => event.author,
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
