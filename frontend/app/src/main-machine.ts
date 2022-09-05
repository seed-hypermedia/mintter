import {activityMachine} from '@app/activity-machine'
import {
  createDraft,
  Document,
  getDraft,
  listDrafts,
  listPublications,
  Publication,
  updateDraftV2 as updateDraft,
} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'
import {createDraftMachine} from '@app/draft-machine'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {queryKeys} from '@app/hooks'
import {link, paragraph, statement, text} from '@app/mttast'
import {createPublicationMachine} from '@app/publication-machine'
import {getRefFromParams} from '@app/utils/machine-utils'
import {libraryMachine} from '@components/library/library-machine'
import {invoke as tauriInvoke} from '@tauri-apps/api'
import Navaid from 'navaid'
import toast from 'react-hot-toast'
import {QueryClient} from 'react-query'
import {ActorRefFrom, assign, createMachine, send, spawn} from 'xstate'

export type PublicationRef = ActorRefFrom<
  ReturnType<typeof createPublicationMachine>
>
export type PublicationWithRef = Publication & {ref: PublicationRef}
export type DraftRef = ActorRefFrom<ReturnType<typeof createDraftMachine>>
export type DraftWithRef = Document & {ref: DraftRef}
export type CurrentFile = PublicationRef | DraftRef

export type MainPageContext = {
  params: {
    docId?: string
    version?: string
    blockId?: string
    replace: boolean
  }
  recents: Array<string>
  library: ActorRefFrom<typeof libraryMachine> | null
  activity: ActorRefFrom<typeof activityMachine> | null
  publicationList: Array<PublicationWithRef>
  draftList: Array<DraftWithRef>
  errorMessage: string
  currentFile: CurrentFile | null
}

type MainPageEvent =
  | {type: 'ROUTE.NOT.FOUND'}
  | {type: 'GO.TO.SETTINGS'}
  | {type: 'GO.TO.HOME'}
  | {type: 'GO.TO.PUBLICATIONLIST'}
  | {type: 'GO.TO.DRAFTLIST'}
  | {type: 'GO.BACK'}
  | {type: 'GO.FORWARD'}
  | {type: 'listenRoute'}
  | {type: 'CREATE.NEW.DRAFT'}
  | {type: 'COMMIT.OPEN.WINDOW'; path?: string}
  | {type: 'COMMIT.EDIT.PUBLICATION'}
  | {type: 'REPORT.FILES.ERROR'; errorMessage: string}
  | {type: 'COMMIT.PUBLISH'; publication: Publication; documentId: string}
  | {type: 'COMMIT.DELETE.FILE'; documentId: string; version: string | null}
  | {type: 'COMMIT.CREATE.REPLY'; url: string}
  | {
      type: 'GO.TO.DRAFT'
      docId: string
      replace?: boolean
    }
  | {
      type: 'GO.TO.PUBLICATION'
      docId: string
      version: string
      blockId?: string
      replace?: boolean
    }
  | {
      type: 'REPORT.FILES.SUCCESS'
      publicationList: Array<Publication>
      draftList: Array<Document>
    }
  | {type: 'EDITING'}
  | {type: 'MOUSE.MOVE'}

type RouterEvent =
  | {type: 'pushHome'}
  | {type: 'pushSettings'}
  | {type: 'pushPublicationList'}
  | {type: 'pushDraftList'}
  | {type: 'listen'}
  | {
      type: 'pushPublication'
      docId: string
      version: string
      blockId?: string
      replace?: boolean
    }
  | {
      type: 'pushDraft'
      docId: string
      replace?: boolean
    }

export type CreateMainPageServiceParams = {
  client: QueryClient
  initialRoute?: string
}

type MainServices = {
  createNewDraft: {
    data: Document
  }
  createReply: {
    data: Document
  }
}

export function createMainPageService({
  client,
  initialRoute,
}: CreateMainPageServiceParams) {
  /** @xstate-layout N4IgpgJg5mDOIC5QFsCGBLAdgWjQYwAsswA6AGwHtUIsoAxdMuAYgCUBRABQHlWAVEnQCSAGXYBlEuICqAYVkTxiUAAcKsdABd0FTMpAAPRAGZjAThIAWAOzmArMbuWADI9cAaEAE8TARmsktv5mAGzOztYATGEAHNYAvvGeaFi4qITE5FQ0mPSMLBw8-IKiEiTsrKy8+moa2rr6RgimFjb2ji5uxp4+CJ0kIcYxzjEhkTHGI0N2ickYOPhEmKQAThQArppwJAQUyGDMstwAssdCAgAi7GJ87CViNepaOnpIhiYxviQxZnbW1mZjL5IpFASEeogQXYvr5nJZQdDfMDIjMkiAUgt0ktVhstrASJAtBQViR0BAmIcTmcBJxpAAhERCcQACUedRejUQyIsZk+IU+ll8o35EIQQrMlhIZgB-0isNhzjMs3R8zSGWWJDWm22hM0xNJ5IO7Au5yEADkAOJs54NN5NXyOEIDUymax2OyRFz-UW+NokUEuYbWRUxT4JNEYtXYzW4nU0PUk3W0ZjHbjScR3VMANXY1vqr1A9uMgpIDj+xbMkWMtg9Pum3ziNndPzMzkiysji0yWrxJBU6wARmR0HhUPmDRSjqdziRZBwAIK3EiFEQATTzHLtXKDJCBVcbcJ+Q1FcqFzvdlkslZCIUsxg7qq7Gp7237Q5HY5emrAKjIXmTEC6KQWAAG4UAA1qQeArGAY5gKwP5-hutqFogZiwiQrjVtYV7jIMPpjAEdi3oKEwhL8IQ4Q+qRPji2r4m+w6juOMG-v+uTMGAKxrCSv5jgAZsSyAkNBsFbAhbHIQW7wIHKrgDBE6H8tYoy+O6J7OL6mF2BMrjRDeKLthGj5Yt2sYMYOTGfroIjoLAmgTgcU7UiQVw3HcwgPG8tQ2tJTT1p8djODp0SCre1gEbe3yAuYxY2DE8XUZi6p0b2EArKg-GaLZ9mOZS06XNc7BLp5ubeU8+acs0xZSmGkQ4a21bBd03hcp6Tq+CEalOF1bqTPexk0aZz7mSJMFwRcGVZcwgEaqBEFQeNWxmmAADuk2ZZoUlVeRMRWMYcoOK4gLRHYoqAnt1a3qCKnDIZSVRmZ9FsGmS5mtwAh0GmZoXNtW5iiCJ7-E6tgxA4YRdW20oPbRMbPRa3AkHwiPMicZWqBVm6oQDkQnvCdgDPjnojBEpiWDDw2pSwCNI4jGZ8Hw5oWko5XsihMnIieYxfAl0TBsY10SqicxDSlcN4swNPIyQtIMkIsiLkI3Bmoy4h8H92Oc61YohHYrSwpMlHg2MIQU2LL6wJLiPSxcrDznQfCq+rrO+VVWu9MiHWjMWJOApWA0i8l0YW1btOuXbDsaxzgPa74lYE6CoSWEFjgooKZvB+ZofS7LjIK4zytR-aMe9JEzjkSQ-iWGMiq6zhAcqqLmfPXO7CLncZrsAA6uH9vOxjbN+W1uPa78AQCyTYwTL65cZ09EvOTO3CcOwZokF35oXNwXdF1yal7a29e7aM-xndr1hIqWl6mFC6EnXPI0t1SM7GjOufy4rhcu5V-1IjYmHAhPqGJwvwWql1DE6G8-JRh600i6B+BwaZ0nnLIAA0rvMU-gCYRHGP4HCAZq7nQCK2MYDhHB+yvMLRuQdiChy+qwLu85WC-W-ljDmnUE44V1nEYiqcfRGTRJgCgEA4D6E7JTLI1BaAMCYPAVh7Mmg2FFAdSI-okQJRsGpfkZcqHiLFlxHikAMFjBPLyZwpZbAk1DAdO8ptBo0Mfr2MkTAMFAgCHET0xE4hqWDLrIGydAg2FvD8BKBkEHi22LsfYGD6pOi9LA4i8oYEnnMDyAEQIHCCnhG6cJFsCTxn1M4sAGDYS-CsMCMw0pzCjFbDEH0ycD62GlLE0IQpdEmXNqNXU+oDHEhKWpYwV9k6KkmEeZOdZWyYTbJDEi0wjKB0eo4uMRJEzxloCUmwqjWzlhvDYcIph6nEQGMCQU6FhixQbno5uvZukrBKREL4gpE5NJqSMOsDopRCnwSMH4eFcmjUYh+ccRSSnQncWDUw3trDXQitrMucRCbV2haMywPx-n0T7JZIFX5WJ-nWfIoesksIDABE4NSYUL51LhbCSUScQGenqnFdFvZAXMS-L0u5BK3Z6z2iia6nVRhXjAZCTSe1KLFnlLrUISp7GLKphZd8bL2Y+R-prIVDYyFQphT6CUqiRi-HhHg90ThmXbFgGATQ2hchyIHq7f6id-T2F5GES8oIPBwovN8N0cdTyTHQu0pu89XxYqVZgHKDkQVcv+jYAInVKyoocIyu8lgfSfEGdCsigIVKmEoqahVVl8zhtcV1b4algoxFCp1JRsc9mYXhR6dRDhfR5pIOlTa4bHIYMDP6ci0I05RF9LYOsN5tIgn8CiIY4wA0OPla2qa2U7JbSjdjIE5jeTjoaq4YMDgfTBS+OMeNl4nDNXDAs2GeTRITXna4qs+05T11cOKEevRry7nIuhIUVZUVRDzRg3kooASPKCgZaYfxOoIJicKsUEpS1p11uRYsDhEiJCAA */
  return createMachine(
    {
      context: () =>
        ({
          params: {
            replace: false,
          },
          recents: [],

          currentFile: null,
          publicationList: [],
          draftList: [],
          errorMessage: '',
          library: null,
          activity: null,
        } as MainPageContext),
      tsTypes: {} as import('./main-machine.typegen').Typegen0,
      schema: {
        context: {} as MainPageContext,
        events: {} as MainPageEvent,
        services: {} as MainServices,
      },
      predictableActionArguments: true,
      invoke: {
        src: 'router',
        id: 'router',
      },
      id: 'main-machine',
      initial: 'loadingFiles',
      states: {
        loadingFiles: {
          invoke: {
            src: 'fetchFiles',
            id: 'fetchFiles',
          },
          on: {
            'REPORT.FILES.SUCCESS': {
              actions: 'assignFiles',
              target: 'routes',
            },
            'REPORT.FILES.ERROR': {
              actions: 'assignError',
              target: 'errored',
            },
          },
        },
        errored: {},
        routes: {
          entry: 'spawnUIMachines',
          initial: 'idle',
          states: {
            idle: {
              entry: send('listen', {to: 'router'}),
            },
            home: {
              entry: ['clearCurrentFile', 'clearParams'],
              tags: ['topbar', 'library'],
              on: {
                'COMMIT.DELETE.FILE': {
                  actions: [
                    'removePublicationFromCitations',
                    'removeFileFromRecentList',
                    'updatePublicationList',
                  ],
                },
              },
            },
            editor: {
              tags: ['topbar', 'library'],
              initial: 'idle',
              states: {
                idle: {
                  entry: 'pushDraftRoute',
                  tags: ['documentView', 'draft'],
                  on: {
                    'COMMIT.PUBLISH': {
                      actions: [
                        'removeDraftFromList',
                        'asssignNewPublicationValues',
                        'removeDraftFromRecents',
                      ],
                      target: '#main-machine.routes.publication.idle',
                    },
                    EDITING: {
                      target: 'editing',
                    },
                  },
                },
                error: {
                  type: 'final',
                },
                editing: {
                  tags: ['documentView', 'draft'],
                  on: {
                    'MOUSE.MOVE': {
                      target: 'idle',
                    },
                  },
                },
              },
            },
            publication: {
              tags: ['topbar', 'library'],
              initial: 'idle',
              states: {
                idle: {
                  entry: 'pushPublicationRoute',
                  tags: ['documentView', 'publication'],
                  on: {
                    'COMMIT.CREATE.REPLY': {
                      target: 'replying',
                    },
                  },
                },
                replying: {
                  invoke: {
                    src: 'createReply',
                    id: 'createReply',
                    onDone: [
                      {
                        actions: 'assignNewDraftValues',
                        target: '#main-machine.routes.editor.idle',
                      },
                    ],
                    onError: [
                      {
                        actions: 'assignError',
                      },
                    ],
                  },
                  tags: ['documentView', 'publication'],
                },
                error: {
                  type: 'final',
                },
              },
            },
            settings: {
              entry: ['clearCurrentFile', 'clearParams', 'pushSettings'],
              tags: 'settings',
            },
            publicationList: {
              entry: [
                'clearCurrentFile',
                'clearParams',
                'pushPublicationListRoute',
              ],
              tags: ['topbar', 'library'],
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    'COMMIT.DELETE.FILE': {
                      actions: [
                        'removePublicationFromCitations',
                        'removeFileFromRecentList',
                        'updatePublicationList',
                      ],
                    },
                  },
                },
              },
            },
            draftList: {
              entry: ['clearCurrentFile', 'clearParams', 'pushDraftListRoute'],
              tags: ['topbar', 'library'],
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    'COMMIT.DELETE.FILE': {
                      actions: ['removeFileFromRecentList', 'updateDraftList'],
                    },
                  },
                },
              },
            },
            createDraft: {
              invoke: {
                src: 'createNewDraft',
                id: 'createNewDraft',
                onDone: [
                  {
                    actions: 'assignNewDraftValues',
                    target: '#main-machine.routes.editor.idle',
                  },
                ],
              },
            },
          },
          on: {
            'ROUTE.NOT.FOUND': {
              target: '.idle',
            },
            'GO.TO.HOME': {
              target: '.home',
            },
            'GO.TO.SETTINGS': {
              target: '.settings',
            },
            'GO.TO.PUBLICATIONLIST': {
              target: '.publicationList',
            },
            'GO.TO.DRAFTLIST': {
              target: '.draftList',
            },
            'GO.TO.DRAFT': {
              actions: [
                'assignDraftParams',
                'assignCurrentDraft',
                'pushDraftToRecents',
              ],
              target: '.editor',
            },
            'GO.TO.PUBLICATION': {
              actions: [
                'assignPublicationParams',
                'assignCurrentPublication',
                'pushPublicationToRecents',
                'pushToActivity',
              ],
              target: '.publication',
            },
            'CREATE.NEW.DRAFT': {
              target: '.createDraft',
            },
            'COMMIT.OPEN.WINDOW': {
              actions: 'openWindow',
            },
            'COMMIT.EDIT.PUBLICATION': {
              actions: 'editPublication',
            },
          },
        },
      },
      on: {
        'GO.BACK': {
          actions: 'navigateBack',
        },
        'GO.FORWARD': {
          actions: 'navigateForward',
        },
      },
    },
    {
      guards: {},
      actions: {
        // @ts-ignore
        spawnUIMachines: assign({
          library: () => spawn(libraryMachine, 'library'),
          activity: () => spawn(activityMachine, 'activity'),
        }),
        removePublicationFromCitations: () => {
          // TODO.
        },

        assignError: assign({
          errorMessage: (_, event) =>
            `[Main Machine]: Error => ${JSON.stringify(event)}`,
        }),
        assignFiles: assign(function assignFilesPredicate(_, event) {
          let draftList = event.draftList.map(function draftListMapper(draft) {
            let editor = buildEditorHook(plugins, EditorMode.Draft)
            return {
              ...draft,
              ref: spawn(
                createDraftMachine({client, draft, editor}),
                getRefFromParams('draft', draft.id, null),
              ),
            }
          })
          let publicationList = event.publicationList.map(
            function publicationListMapper(publication) {
              let editor = buildEditorHook(plugins, EditorMode.Publication)
              return {
                ...publication,
                ref: spawn(
                  createPublicationMachine({client, publication, editor}),
                  getRefFromParams(
                    'pub',
                    publication.document.id,
                    publication.version,
                  ),
                ),
              }
            },
          )
          return {
            publicationList,
            draftList,
          }
        }),
        assignCurrentPublication: assign({
          currentFile: (context, event) => {
            return (
              context.publicationList.find(
                (p) =>
                  p.ref.id ==
                  getRefFromParams('pub', event.docId, event.version),
              )?.ref ?? null
            )
          },
        }),
        assignCurrentDraft: assign({
          currentFile: (context, event) => {
            return (
              context.draftList.find(
                (d) => d.ref.id == getRefFromParams('draft', event.docId, null),
              )?.ref ?? null
            )
          },
        }),
        pushPublicationToRecents: assign({
          recents: (context, event) => {
            let set = new Set<string>(context.recents)
            let fileRef = getRefFromParams('pub', event.docId, event.version)
            if (set.has(fileRef)) {
              set.delete(fileRef)
            }
            set.add(fileRef)

            return [...set]
          },
        }),
        pushDraftToRecents: assign({
          recents: (context, event) => {
            let set = new Set<string>(context.recents)
            let fileRef = getRefFromParams('draft', event.docId, null)
            if (set.has(fileRef)) {
              set.delete(fileRef)
            }
            set.add(fileRef)

            return [...set]
          },
        }),
        assignPublicationParams: assign({
          params: (_, event) => ({
            docId: event.docId,
            version: event.version,
            blockId: event.blockId,
            replace: !!event.replace,
          }),
        }),
        assignDraftParams: assign({
          params: (_, event) => ({
            docId: event.docId,
            version: undefined,
            blockId: undefined,
            replace: !!event.replace,
          }),
        }),
        openWindow: async (context, event) => {
          openWindow(event.path)
        },
        pushToActivity: (context, event) => {
          let url = `${event.docId}/${event.version}`
          context.activity?.send({
            type: 'VISIT.PUBLICATION',
            url,
          })
        },
        clearCurrentFile: assign({
          // eslint-disable-next-line
          currentFile: (c) => null,
        }),
        pushPublicationRoute: send(
          (context) => {
            return {
              type: 'pushPublication',
              docId: context.params.docId,
              version: context.params.version,
              blockId: context.params.blockId,
              replace: context.params.replace,
            }
          },
          {to: 'router'},
        ),
        pushDraftRoute: send(
          (context) => {
            return {
              type: 'pushDraft',
              docId: context.params.docId,
              blockId: context.params.blockId,
              replace: context.params.replace,
            }
          },
          {to: 'router'},
        ),
        pushSettings: send(
          {
            type: 'pushSettings',
          },
          {to: 'router'},
        ),
        // eslint-disable-next-line
        clearParams: assign((x) => ({
          params: {
            docId: undefined,
            version: undefined,
            blockId: undefined,
            replace: false,
          },
        })),
        navigateBack: () => {
          if (!window.history) return
          window.history.back()
        },
        navigateForward: () => {
          if (!window.history) return
          window.history.forward()
        },
        pushDraftListRoute: send(
          {
            type: 'pushDraftList',
          },
          {to: 'router'},
        ),
        pushPublicationListRoute: send(
          {
            type: 'pushPublicationList',
          },
          {to: 'router'},
        ),
        editPublication: (context) => {
          createDraft(context.params.docId)
            .then((doc) => {
              openWindow(`/editor/${doc.id}`)
            })
            .catch((err) => {
              toast.error(
                `[CREATE.EDIT.ERROR]: Something went wrong when creating a new Edit. chec the console.`,
              )
              console.error('[CREATE.EDIT.ERROR]:', err)
            })
        },
        updateDraftList: assign((context, event) => {
          let draftId = getRefFromParams('draft', event.documentId, null)
          return {
            draftList: context.draftList.filter((d) => d.ref.id != draftId),
          }
        }),
        updatePublicationList: assign((context, event) => {
          let pubId = getRefFromParams('pub', event.documentId, event.version)
          return {
            publicationList: context.publicationList.filter(
              (p) => p.ref.id != pubId,
            ),
          }
        }),
        removeFileFromRecentList: assign({
          recents: (context, event) =>
            context.recents.filter((ref) => !ref.includes(event.documentId)),
        }),
        assignNewDraftValues: assign((context, event) => {
          let editor = buildEditorHook(plugins, EditorMode.Draft)
          let draftRef = spawn(
            createDraftMachine({client, editor, draft: event.data}),
            getRefFromParams('draft', event.data.id, null),
          )
          return {
            params: {
              docId: event.data.id,
              replace: true,
              version: undefined,
              blockId: undefined,
            },
            currentFile: draftRef,
            draftList: [
              ...context.draftList,
              {
                ...event.data,
                ref: draftRef,
              },
            ],
          }
        }),
        // eslint-disable-next-line
        asssignNewPublicationValues: assign((context, event) => {
          let editor = buildEditorHook(plugins, EditorMode.Publication)
          let publicationRef = spawn(
            createPublicationMachine({
              client,
              publication: event.publication,
              editor,
            }),
            getRefFromParams(
              'pub',
              event.documentId,
              event.publication.version,
            ),
          )

          return {
            params: {
              docId: event.publication.document?.id,
              version: event.publication.version,
              blockId: undefined,
              replace: true,
            },
            currentFile: publicationRef,
            publicationList: [
              ...context.publicationList,
              {
                ...event.publication,
                ref: publicationRef,
              },
            ],
          }
        }),
        removeDraftFromList: assign({
          draftList: (context, event) => {
            let ref = getRefFromParams('draft', event.documentId, null)
            return context.draftList.filter((d) => d.ref.id != ref)
          },
        }),
        removeDraftFromRecents: assign({
          recents: (context, event) => {
            let ref = getRefFromParams('draft', event.documentId, null)
            let _set = new Set(context.recents)
            _set.delete(ref)
            return [..._set]
          },
        }),
      },
      services: {
        fetchFiles: () => (sendBack) => {
          Promise.all([
            client.fetchQuery([queryKeys.GET_PUBLICATION_LIST], () =>
              listPublications(),
            ),
            client.fetchQuery([queryKeys.GET_DRAFT_LIST], () => listDrafts()),
          ])
            .then(function filesResponse([pubList, draftList]) {
              sendBack({
                type: 'REPORT.FILES.SUCCESS',
                publicationList: pubList.publications.sort((a, b) => {
                  // @ts-ignore
                  return (
                    new Date(b.document?.createTime) -
                    new Date(a.document?.createTime)
                  )
                }),
                draftList: draftList.documents.sort((a, b) => {
                  // @ts-ignore
                  return new Date(b.createTime) - new Date(a.createTime)
                }),
              })
            })
            .catch((error) => {
              sendBack({
                type: 'REPORT.FILES.ERROR',
                errorMessage: JSON.stringify(error),
              })
            })
        },
        // router reference: https://gist.github.com/ChrisShank/369aa8cbd4002244d7769bd1ba3e232a
        router: () => (sendBack, receive) => {
          let navRouter = Navaid('/', () => sendBack('GO.TO.HOME'))
          // Deserialize events from the URL
          navRouter
            .on('/', () => {
              sendBack('GO.TO.HOME')
            })
            .on('/settings', () => {
              sendBack('GO.TO.SETTINGS')
            })
            .on('/publications', () => {
              sendBack('GO.TO.PUBLICATIONLIST')
            })
            .on('/drafts', () => {
              sendBack('GO.TO.DRAFTLIST')
            })
            .on<{docId: string}>('/editor/:docId', (params) => {
              return params
                ? sendBack({type: 'GO.TO.DRAFT', ...params})
                : sendBack('ROUTE.NOT.FOUND')
            })
            .on<{
              docId: string
              version?: string
              blockId?: string
            }>('/p/:docId/:version?/:blockId?', (params) => {
              return params
                ? sendBack({
                    type: 'GO.TO.PUBLICATION',
                    docId: params.docId,
                    version: params.version as string,
                    blockId: params.blockId,
                  })
                : sendBack('ROUTE.NOT.FOUND')
            })

          receive((event: RouterEvent) => {
            if (event.type == 'listen') {
              /**
               * we initialize the app in a particular route based for testing purposes, that's why we can pass a `initialRoute` prop to `<App />`
               */
              navRouter.listen(initialRoute)
            }
            if (event.type == 'pushHome') {
              navRouter.route('/')
            } else if (event.type == 'pushPublication') {
              let {pathname} = window.location
              let newRoute = `/p/${event.docId}${
                event.version
                  ? `/${event.version}${
                      event.blockId ? `/${event.blockId}` : ''
                    }`
                  : ''
              }`
              if (pathname != newRoute) {
                navRouter.route(newRoute, event.replace)
              }
            } else if (event.type == 'pushDraft') {
              let {pathname} = window.location
              let newRoute = `/editor/${event.docId}`
              if (pathname != newRoute) {
                navRouter.route(newRoute, event.replace)
              }
            } else if (event.type == 'pushPublicationList') {
              navRouter.route('/publications')
            } else if (event.type == 'pushDraftList') {
              navRouter.route('/drafts')
            } else if (event.type == 'pushSettings') {
              navRouter.route('/settings')
            } else {
              navRouter.route('/')
            }
          })

          return () => navRouter?.unlisten?.()
        },
        createNewDraft: async () => {
          let doc = await createDraft()
          return doc
        },
        createReply: async (context) => {
          /**
           * - create draft
           * - create block with link
           * - update draft
           * - return draft
           */
          let currentPub = context.currentFile?.getSnapshot()
          let currentUrl = `mtt://${currentPub?.context.documentId}/${currentPub?.context.version}`
          let doc = await createDraft()
          let block = statement([
            paragraph([
              text('Reply to '),
              link(
                {
                  url: currentUrl,
                },
                [text(currentPub?.context.title || currentUrl)],
              ),
              text(': '),
            ]),
          ])
          try {
            await updateDraft({
              documentId: doc.id,
              changes: [
                {
                  op: {
                    $case: 'setTitle',
                    setTitle: `Reply to ${
                      currentPub?.context.title || currentUrl
                    }`,
                  },
                },
                {
                  op: {
                    $case: 'moveBlock',
                    moveBlock: {
                      parent: '',
                      leftSibling: '',
                      blockId: block.id,
                    },
                  },
                },
                {
                  op: {
                    $case: 'replaceBlock',
                    replaceBlock: blockToApi(block),
                  },
                },
              ],
            })
            return getDraft(doc.id)
          } catch (err) {
            throw Error(`[REPLYTO ERROR]: ${JSON.stringify(err)}`)
          }
        },
      },
    },
  )
}

function openWindow(path?: string) {
  if (path) {
    // Open window with path
    tauriInvoke('plugin:window|open', {path})
  } else {
    createDraft().then((doc) => {
      let path = `/editor/${doc.id}`
      // open window with new path
      tauriInvoke('plugin:window|open', {path})
    })
  }
}
