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
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAjANgSwMYEMAXbAewDsBZfXAC2zLADoJtZdVZZSzHsJMwAYkQoSXYuREgAHogCMANgAMjBQBYArAA4ATHoCccuRv16ANCACeiNWoDMquwHZ9+p1oXa9TtQF9fFmhYeETcVLT0TCxsHFzkjABmYIQRZFCCACIAkgDKAMIAqjk5WQDyAHKMAEoAogAKpVUAKow1VVWNUshi2BJkUrIIclpOjBpOOqZ2ikpaw1oaFtYIdkr6jC5qOiNy+kp2agr6Gv6BGDgEfeF0DMys7Jzcicmp6dn5RSUV1fWNLTkFPJ5GrFLo9PoDRAjJZQuRqRhqNzOLT6BQeOx2E4BEBBC6hcjXSJ3GKPeIAJzA+AglkYdAgEDAZEyuUKxTKlRyAAlSgB1MHibiQhAaOwKMbTPRyHRrVGimEIUxaRgjHR2DwzBZqOSnHHnEJXag3KL3WJPClUml0hlM96sr6VJqlADiToAMjV+b1BUgZIgNDo5IwDiiDlLVoi7PL3BpGEoTLppZ41E5xjrcfqwoaidEHnEeObqYwAG6sbBYIS2z7sxicrIZD0+7oCyQ+wb+wPBvZKHROJzh-TyrR2HSMVx9+z2JTKXZpvWXTOpY0kvOMAs0ktccvMj5s76Ol3uz0Q1t+gNBtQopTd3v9wdaFT6YPqFzjbaz4LzglZ24503xMBkmSJAUhA252tWABiNRNHknKMBkACCTQIUe3qgIMwyjK+UwavMixWIgdjHBsV4isYV77EYCjvniBqLow6afjwfACIIrqlAhGSoS26HyNMQaYnshwpiY-rysYhiqL2ChokRChyL2WJnB++KUN+TCMapjAAUBIGCHUBQAEKulkeRIZB0GwfBSEoY24Job6woYqOcJXo+mJ9voajiVK8K9uiF5OEoF4aNq2KaXRRoMXOWlJCkNzpAZxmmeZ3y1A0zSMACQIgjk3H9CeCCIoGSLHKKaKogoTjicOMbjBoIVyNMopNTRGZfvREVPHFrz6UZJlmU01bpX8rTtJ0dnNgVvFFZJpUijJKIydVBFDKq6wyaYaizAGVVOG1TGErcXXkpS1KCAU5TsZx+VCjJDh9gpcYybYchKHI4mHOsmjBfJwwNUiB2qUdGkxX0q5nZYfXJYNw31K6ACajCOrdhXaDG22hYob3qNMH2rU9gZuQtqoKXMQORZE0MDallQjZlCEFE03JVFlgLAqCk1ejxjmrKMsyHDoCiJqYqriTo-jYmQJAMvAjZgwuUW-qSzH8GAqMzb28r2EqUqqlVzjqDJU4U4r2YmirzzxfQUAa45tjrKKbieG4GgKBK+HLJiMYBj4BsLHseh+OFCsdUrFsrmutJ8NaduDD4I5rG9qISVqoWDkcjB62qexOMYWjkyHKmUz+EdmpDxaluWceEfoSqzFOKb3V5CwrcsezfTJiiIlVcwYqbYfm8u5cWjXKw+LG95VW77st+MUZNbGhhrGqwvBamRe0WbpfD-+gHAZAY9a6tGIqFsP3dqsmJagPan0creZjyK8qqqMugaCTEw9lowfKVvg-HVDqrAQY9dgODjHCJw8kLxxlCt5Am21wFEVlFqPsqwlK6mLtvUGWC966UPlzY8mt7xSWGAcGUIoMQ+WFgid6dCiJ900LfEG0VcE8B6glI+bd5Bwj8jAoiuwm4jGYepVh-98yQyfsRfYSh-LTl9twoY8k6pCW-hVHsIjOpAIhsgTAlgmgkCflAhERxtDu2NjoLU4lezwkOBRWR8Zha-0weIlhJ1po4nsjzNskYCZxhHPeVwU5lqwIlpvdqd8jRj0mD5eEexhZBVbrYNU+1JZAA */
  return createMachine(
    {
      id: 'publication-machine',
      tsTypes: {} as import('./publication-machine.typegen').Typegen0,
      schema: {
        context: {} as PublicationContext,
        events: {} as PublicationEvent,
      },
      predictableActionArguments: true,
      invoke: {
        src: 'fetchAuthor',
        id: 'fetchAuthor',
        onDone: {
          actions: 'assignAuthor',
        },
        onError: {},
      },
      type: 'parallel',
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
              tags: ['ready'],
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
