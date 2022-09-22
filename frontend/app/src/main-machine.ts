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
import {QueryClient} from '@tanstack/react-query'
import {invoke as tauriInvoke} from '@tauri-apps/api'
import Navaid from 'navaid'
import toast from 'react-hot-toast'
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
  library: ActorRefFrom<typeof libraryMachine>
  activity: ActorRefFrom<typeof activityMachine>
  publicationList: Array<PublicationWithRef>
  draftList: Array<DraftWithRef>
  errorMessage: string
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
  fetchFiles: {
    data: {
      publicationList: Array<Publication>
      draftList: Array<Document>
    }
  }
}

export function createMainPageService({
  client,
  initialRoute,
}: CreateMainPageServiceParams) {
  /** @xstate-layout N4IgpgJg5mDOIC5QFsCGBLAdgWjQYwAsswA6AJwHsBXAFzhIIuTAGIBhAeQFkuBJAFRIARAKIAZEfxEkAYrwmJQABwqx0NdBUyKQAD0QAWAAxGSADgMB2AGw2D16wFZLjgMwAaEAE9EZowEYSS1cAgCZQlxdrUOsAX1jPNCxcVEJicmo6WBJIdQoyEnQIABtWTh4BEgAFAFUAITFeAGUACR0VNQ0tHX0EfzNXMyCBm38x6IBOazNPHz6pxxIjJ1cJx39Q10sJiYN4xIwcfCJMUkpaelyafMKS1hEhAV4AOQBxdtV1TW0kPUQNgyhEhTVzGCZmaJGeyOWaIcJjJZjAxWBaOaz+Vz7EBJI6pE5nTKXCB5ApXLBQEg0LxKcksLgcGpNaT0gBqIg+nW+PX+6yGrlB0ycjiME0sFlhCHhpkcoSM635rkcMssWJxKTSpwyF2yVxuZMwFMwFBoAAIqTSDSwHk83hyvt1fr1-LySPz7BClSKxQYJeFHEMDBNloqDBCjJZ-HsEtjDur8VqsiQlFQAEbFdB4VBdTC3Ursbh8QRsABKIgAglISKWqmIAJp27PcyUGUFLYUR3nOsyR32AgzAqLg6wGJUQ1Wx47pc6J5NpjNZ77kMBKYpeWkQLSkLAANwoAGtSHgyGAs2Bi8vVw2uY7ELtTP45ci5bszGZwRL+s6SGjuxjooMjG7cdkknTVp3oWd00zbMlxXNdLTAMhKAKFcswAM3yZASCPE86HPOCrwdUBegiEJXUcIM1n8CZQmo-xfVcWVyM-RioScUIowOEC8SnQlskg+dszEdBYBoXMygLSpRAkSs5AUX4OntH5iMQJxrHMKF-FsMxLBcLTrA-UN1ICFsIWsRV+R2YDcQ1AltRICAyFQNCaGE0TxPzCpBGkyRpDk9kFM+RsbwQRVFhM0IdgWXSfW8f5dkWVYzCVdYxmCMxQmsuNePsnDTyEJyXJYDdNR3fdD2PU9njAAB3ArnJoQjlL+BAIwDXS-EBcMtksCVnEWbZLBHDraIsTLozVUC7KyFhiwZStng4QQZAZZ4hCaptI1CCUI1cIIKIoodNkGRwsqmhM4BYV4OBIfgbpabgAuUILrxUvpAQlUV1P5TZrF2Gx-RbM6eLAvirpuu6SCZfh+BeV4mg2kKto-fxLCBdFQwGIwtnBRjgdsi7YHB26btqBpeDYCteA4Z5GiafhEbe5G4vemilhiNGdLWEZTomicQemy7rpJ4RizLGR+DphnAs5IiWuZuZqNCRZjBO0FATRUV8fjcCieFyGhDFiXGflj6WdoiZAkVCxoiG7tnExPnuIJ3XichsnGkp2GaZNp0zbmTY32BCZBho1xnVccy4idmydbBktywWkQAHVRfF6Xntl5q-e2lmKP7MUBmRDLtj+8auNjnKZvKQsSA4KoRGeEhk5eIQOGT33-lDIFSMjh9nFFXYJVBIYIWG6woTRextary6a8qa1BA9imqZ9mWlM2qxTC2HSLFRt8ZnN6JgQ2Qv+gMMYNmjivstOYrN0KTBdwPEg0LAGhCBkdBSngdfgqZwMlgSAtkiv0CMgFxQsw2DPO+iFkJJmKOhTCr936f2-nATuCBbC+goqYXYaVkShAyhEGBrBhZ1DLGwAA0pg50gFgEX1fCODiQ0aK+m7N9aYr43BRS0qQ4mK1izJzLMWdaf9Xqm3BCQYcco3ChjvC2X0wRTAX0sF6NwAxuyO2jEaCAGDfiTQFjkJC+RICYM2BMDSFEBio3+oQ30E9+yAiIRPaIAxaKcRjM7OO9kiilEwfyIBB8L5OHkaCXqLNphAhcG+MU-Q-DOn8KQwmDAmBgEwX9UwtFbZQgjDYOUH4jAxGAeHUESpIpqOWMk3WORiTXAKH49J4i5a9HBPeR8xh86vnfObDEliZQcVokQmw4Rql8VqSSYxyFMGikWP3J8XSD6+nDNKcO6xcktkDGM+yupSR1PJJSak5JaG2EWOsKeWlGJvhhObDx0jRhojFMsYwKoY630FjqOpep9kGhIEaU05pjnNOzv8QYfJ1ZozlC4EINyA5DJIKjdEjy-AyNeTfc6NTdkTI0AaWhkd+xuisLKfqMLfQYiGG4TYkZwRDXDtsxMuyZnrARR058mMemKx2BSls4chnRDcNfLxldQb2QEtBRcjTzFXyCBiEcE9wikvNlsRYbSASAUGMiNFQr3kpLFQuLQsFVxAszhvEKMQJ4MI1dRTqgFewIhCJHAIyx0QQi1YYl24y9UwTgfkcx2T2bgmpYEnYBklXLGBG+TZsoikR3pRBVMUF9XNUUv-FqtEikyrKfKzYBTbmKiWGEa2MpoFvIxeM2A78cVQF-ia1NvRw6WIiLREIYwoShgxCjOU0iOKClxkQ8Ecb+IJsEt8NyYlJXAqbHbV0wQ-SbBiFYWKitzL9hfGlCI3pPHup8TOYd4qtBjoyYxDSISxS6XWA4D8oCljmTHtjCwF9B0OUKq5ES467iYMBBSrSL4iFhTGMspwroL7hxbOZSIgrt2z2yI5Bqh7J0hX5IECKUUnAxQ-C4FRKJGJWA2E2p9eU6D1RcgElswDhwWF5T+CMfVzLDF0srTYhcxSDtof0CUX7zCXO2K+P6kZnSkM-R4FmltgTrFLuiSMUIaLxHiEAA */
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
          library: spawn(libraryMachine, 'library'),
          activity: spawn(activityMachine, 'activity'),
        } as MainPageContext),
      tsTypes: {} as import('./main-machine.typegen').Typegen0,
      schema: {
        context: {} as MainPageContext,
        events: {} as MainPageEvent,
        services: {} as MainServices,
      },
      predictableActionArguments: true,
      invoke: [
        {
          src: 'router',
          id: 'router',
        },
        {
          src: 'fetchFiles',
          id: 'fetchFiles',
          onDone: [
            {
              actions: 'assignFiles',
            },
          ],
          onError: [
            {
              actions: 'assignError',
              target: '.errored',
            },
          ],
        },
      ],
      id: 'main-machine',
      initial: 'routes',
      states: {
        errored: {},
        routes: {
          initial: 'idle',
          states: {
            idle: {
              entry: send('listen', {to: 'router'}),
              tags: 'loading',
            },
            home: {
              entry: ['clearCurrentFile', 'clearParams'],
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
              initial: 'idle',
              entry: ['pushDraftRoute', 'pushDraftToRecents'],
              states: {
                idle: {
                  tags: ['documentView', 'draft'],
                  on: {
                    'COMMIT.PUBLISH': {
                      actions: [
                        'removeDraftFromList',
                        'asssignNewPublicationValues',
                        'removeDraftFromRecents',
                      ],
                      target: '#main-machine.routes.publication',
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
                  initial: 'not typing',
                  states: {
                    typing: {
                      on: {
                        'MOUSE.MOVE': {
                          target: 'not typing',
                        },
                      },
                    },
                    'not typing': {
                      on: {
                        EDITING: {
                          target: 'typing',
                        },
                      },
                    },
                  },
                },
              },
            },
            publication: {
              initial: 'idle',
              entry: ['pushPublicationRoute', 'pushPublicationToRecents'],
              states: {
                idle: {
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
                        target: '#main-machine.routes.editor',
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
                    target: '#main-machine.routes.editor',
                  },
                ],
              },
              tags: 'loading',
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
              actions: ['assignDraftParams'],
              target: '.editor',
            },
            'GO.TO.PUBLICATION': {
              actions: ['assignPublicationParams', 'pushToActivity'],
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
      actions: {
        removePublicationFromCitations: () => {
          // TODO.
        },

        assignError: assign({
          errorMessage: (_, event) =>
            `[Main Machine]: Error => ${JSON.stringify(event)}`,
        }),
        assignFiles: assign(function assignFilesPredicate(_, event) {
          console.log('assignFiles call', event.data)
          let draftList = event.data.draftList.map(function draftListMapper(
            draft,
          ) {
            let editor = buildEditorHook(plugins, EditorMode.Draft)
            return {
              ...draft,
              ref: spawn(
                createDraftMachine({client, draft, editor}),
                getRefFromParams('draft', draft.id, null),
              ),
            }
          })
          let publicationList = event.data.publicationList.map(
            function publicationListMapper(publication) {
              let editor = buildEditorHook(plugins, EditorMode.Publication)
              return {
                ...publication,
                ref: spawn(
                  createPublicationMachine({client, publication, editor}),
                  getRefFromParams(
                    'pub',
                    (publication.document as Document).id,
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
        fetchFiles: () =>
          Promise.all([
            client.fetchQuery([queryKeys.GET_PUBLICATION_LIST], () =>
              listPublications(),
            ),
            client.fetchQuery([queryKeys.GET_DRAFT_LIST], () => listDrafts()),
          ]).then(function filesResponse([pubList, draftList]) {
            return {
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
            }
          }),
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
          try {
            // TODO: change the currentFile access here
            var currentPub = context.currentFile?.getSnapshot()
          } catch (err) {
            throw Error(
              `[REPLYTO ERROR]: currentFile does not have a snapshot - ${JSON.stringify(
                err,
              )}`,
            )
          }

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
