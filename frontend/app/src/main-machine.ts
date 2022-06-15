import type { Document } from '@app/client'
import {
  createDraft, listDrafts,
  listPublications,
  Publication,
  publishDraft
} from '@app/client'
import { createDraftMachine } from '@app/draft-machine'
import { buildEditorHook, EditorMode } from '@app/editor/plugin-utils'
import { plugins } from '@app/editor/plugins'
import { queryKeys } from '@app/hooks'
import { createPublicationMachine } from '@app/publication-machine'
import { DeepPartial } from '@app/types'
import { debug } from '@app/utils/logger'
import { getRefFromParams } from '@app/utils/machine-utils'
import { libraryMachine } from '@components/library/library-machine'
import { invoke as tauriInvoke } from '@tauri-apps/api'
import isEqual from 'fast-deep-equal'
import Navaid from 'navaid'
import { QueryClient } from 'react-query'
import { ActorRefFrom, assign, createMachine, send, sendParent, spawn } from 'xstate'

export type PublicationRef = ActorRefFrom<
  ReturnType<typeof createPublicationMachine>
>
export type PublicationWithRef = Publication & { ref: PublicationRef }
export type DraftRef = ActorRefFrom<ReturnType<typeof createDraftMachine>>
export type DraftWithRef = Document & { ref: DraftRef }
export type CurrentFile = PublicationRef | DraftRef

export type MainPageContext = {
  params: {
    docId: string
    version: string | null
    blockId: string | null
    replace: boolean
  }
  recents: Array<PublicationRef | DraftRef>
  library: ActorRefFrom<typeof libraryMachine> | null
  publicationList: Array<PublicationWithRef>
  draftList: Array<DraftWithRef>
  errorMessage: string
  currentFile: PublicationRef | DraftRef | null
}

type MainPageEvent =
  | {
    type: 'ROUTE.NOT.FOUND'
  }
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
    type: 'GO.TO.SETTINGS'
  }
  | {
    type: 'GO.TO.HOME'
  }
  | {
    type: 'GO.TO.PUBLICATIONLIST'
  }
  | {
    type: 'GO.TO.DRAFTLIST'
  }
  | {
    type: 'GO.BACK'
  }
  | {
    type: 'GO.FORWARD'
  }
  | {
    type: 'listenRoute'
  }
  | {
    type: 'CREATE.NEW.DRAFT'
  }
  | {
    type: 'COMMIT.OPEN.WINDOW'
    path?: string
  }
  | {
    type: 'COMMIT.EDIT.PUBLICATION'
    docId: string
  }
  | {
    type: 'REPORT.FILES.SUCCESS'
    publicationList: Array<Publication>
    draftList: Array<Document>
  }
  | { type: 'REPORT.FILES.ERROR'; errorMessage: string }
  | { type: 'COMMIT.PUBLISH'; publication: Publication; documentId: string }
  | { type: 'COMMIT.DELETE.FILE'; documentId: string; version: string | null }

type RouterEvent =
  | {
    type: 'pushHome'
  }
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
  | {
    type: 'pushSettings'
  }
  | {
    type: 'pushPublicationList'
  }
  | {
    type: 'pushDraftList'
  }
  | {
    type: 'listen'
  }

export function defaultMainPageContext(
  overrides: DeepPartial<MainPageContext> = {
    params: { docId: '', version: null, blockId: null, replace: false },
  },
) {
  return {
    params: {
      docId: '',
      version: null,
      blockId: null,
      ...overrides.params,
    },
    recents: [],
    library: spawn(libraryMachine, 'library'),
    currentFile: null,
    publicationList: [],
    draftList: [],
    errorMessage: '',
    ...overrides,
  } as MainPageContext
}

export type CreateMainPageServiceParams = {
  client: QueryClient
  initialRoute?: string
}

export function createMainPageService({
  client,
  initialRoute,
}: CreateMainPageServiceParams) {
  /** @xstate-layout N4IgpgJg5mDOIC5QFsCGBLAdgWgA6pgDoAnAewFcAXOQydS04wgN1QBt0JVKsoBiRKFylY9dKUyCQAD0QBGAOwBmAEyEFKgGzalChQA45czUoA0IAJ7yALAAYArIWOb7+65rn2F1lfYC+fuZoWHgEYCQU1LC0EPSMLOycfFCkACqkAKKxDMRSwqI8ElKyCIqaCoRK9oq25bZKAJx21uZWpSpVTtqatioa9rbeCgFBGDj4RGRUNHQ5fADKGamEAMIAqgBKGxkAcssAIgDy6wCyu6l5ImJFSDLyyg2EDbVK7q5KcrYtlvK11l0uBr6JQuHyDEYgYLjMIRabRXDkABGHAAxtxxJgEhwuDxMPxLgUMcV5H19IR7M0vPYqV8VK1ECpappCMD6h05B0GuUIVDQpNIjQEcj0GjCpjWNjkmlSAAFJGo9E3IRXMXE0ofJRdam2L7A1T6ez00oGiqspS2ZyfCmaHljPnhKZRQhChVirFJFLpLJxXK3fLXSS3EocgyEeoNORKKoNVxcuRGyMKZndHqfaz6FRufyBSF2iYOgXw+UixWYBZLVabbZ7QhHU7nAkBtUmNQG2wGzQGhoNRoKBPlRwqTxfD76QxGG053n52FRPiOsA7UiUABiFEwEEbqqDJLpPwQXNsT27zwpKme1l0tpCM4XsCl6QAEqRkGAt0Sd+0921jA0KtYT2sJM3E8FQVGvaF+ThB9SHmMBKFxKB4D9FUP1AYMwKNMDrH+ADu2qBR2xwtwIPtWc4BguVhVFDEABl0FgSh3yVO4vwTfQFDkQg8KaQjI0vTRwKnPMYTvGD9mIVAADNKHoxjmMDdDdyNTijwGHUHD49sPFI29Cxg70cgUtUOW-BlNO4wCex6JpfF00T9M9WVixolj-W3JSEB6TV+j0BR7B7VwPATX8nkZPR7HCzQGiE0Ybwc6CVkOE4TgASWWGU1gAIVo1KVgAQVSVLDh2YzP1MhNMy4lMHANAYM2GYT4qgucVm2QqMgAfR2DIAHVOv2DZ8pXC4UMJFiMLMhB9G0Sz8L0YiI30eyWoow4ZV2TretSnYjl6srPM+GNCDAvoVDw4FnjMfcgIqDSdUvALQS+FaC2gjJ9nSzrMpyvLCuK0qxqbcr201bUQL6Z4M2utolH0R4T3wv8vBeprILAKUstQFEAGsDtYoxGTDAw5CaGKh0vKbuzDe7gUu9Tszi9GpTXYgAHdUGITcgY8gmjCPHpqS0WwuSHDNKoCHNMFICA4CkacYU4Ng3x5tDWKAo1VDkV7yOiJWVeVcbFNYqqnjkOxBOBewqn0I0Y3+RGOX0WoIz-HW70IAALF8DZAdy1ZKXxqpjKNahFqNwv7IDj3wnpO0+MD3cLGIfXdHFeHx4NLwqD5fDpxp1PjfdIw4lkI5ms0vCUJO4RTnI08z+RuzJfyFB7VRMzHeoE2sc3Kgj7R6kMDxrBrp1ZniMBiDIX1DeBw7Ip8nsw-NPpXiLn9RzL1Qoeta3q7RsiPYn2e-dQiabEjSoOXeemdQ3+RjDUZx010Nw9F6MfBRc0s0-RPFG7TUIk4dwGZQJdxmlhF4x5CI6i5DFKMB8mZH2Ti6EsboJScEAZ4HC5JOIaFgRmTshp9yMmpt2PiNRajw0asgvStc0GuUxFPGe2CXaEDjgaOwYCwIwybs7SysDzbGF0P5L+RZqKlkAW4Zk5tOxDkihAzQCYDD-DNBaHsvcfC0NzM1N6TpYDwUQshOevNA6zSqloLwHgiHd1IWUGO9sNDaEIrFXR6NdbOh-mKOSTFVYXwQB8I8AExaKCBBGb4P5naakRupD4LhlqH3oU6CAkkZK+MAVoHOXxorWDPNUZ2yj9yaEvDTDSHFSbmkMOIwgKJiBgG4GACS0k-GmIDogVQ-xCIfBwgYDwYEH7TU6Pdfi5tVCfySQlKIgCgRGmpBURGnZegxVRnQsImS+GlDdpLIAA */
  return createMachine(
    {
      context: () => ({
        params: {
          docId: '',
          version: null,
          blockId: null,
          replace: false,
        },
        recents: [],
        library: spawn(libraryMachine, 'library'),
        currentFile: null,
        publicationList: [],
        draftList: [],
        errorMessage: '',
      }),
      tsTypes: {} as import("./main-machine.typegen").Typegen0,
      schema: {
        context: {} as MainPageContext, events: {} as MainPageEvent,
        services: {
          createNewDraft: {
            data: Document
          }
        }
      },
      id: 'main-page',
      initial: 'loadingFiles',
      invoke: {
        src: 'router',
        id: 'router',
      },
      states: {
        loadingFiles: {
          invoke: {
            id: 'fetchFiles',
            src: 'fetchFiles',
          },
          on: {
            'REPORT.FILES.SUCCESS': {
              actions: ['assignFiles'],
              target: 'routes',
            },
            'REPORT.FILES.ERROR': {
              actions: ['assignError'],
              target: 'errored',
            },
          },
        },
        errored: {},
        routes: {
          id: 'routes',
          initial: 'idle',
          states: {
            idle: {
              entry: send('listen', { to: 'router' }),
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
              initial: 'validating',
              states: {
                validating: {
                  always: [
                    {
                      actions: [
                        'pushToRecents',
                        'setDraftParams',
                        'setDraftAsCurrent',
                      ],
                      cond: 'isMetaEventDifferent',
                      target: 'valid',
                    },
                    {
                      target: 'error',
                    },
                  ],
                },
                valid: {
                  entry: ['pushDraftRoute'],
                  tags: ['documentView', 'draft'],
                  on: {
                    'GO.TO.DRAFT': [
                      {
                        cond: 'isEventDifferent',
                        actions: ['pushToRecents'],
                        target: 'validating',
                      },
                      {},
                    ],
                  },
                },
                error: {
                  type: 'final',
                },
              },
            },
            publication: {
              tags: ['topbar', 'library'],
              initial: 'validating',
              states: {
                validating: {
                  always: [
                    {
                      actions: [
                        'pushToRecents',
                        'setPublicationParams',
                        'setPublicationAsCurrent',
                      ],
                      cond: 'isMetaEventDifferent',
                      target: 'valid',
                    },
                    {
                      target: 'error',
                    },
                  ],
                },
                valid: {
                  entry: ['pushPublicationRoute'],
                  tags: ['documentView', 'publication'],
                  on: {
                    'GO.TO.PUBLICATION': [
                      {
                        cond: 'isEventDifferent',
                        actions: ['pushToRecents'],
                        target: 'validating',
                      },
                      {},
                    ],
                    'GO.TO.DRAFT': {
                      target: '#main-page.routes.editor',
                    },
                  },
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
                onDone: {
                  actions: ['assignNewDraftValues'],
                  target: 'editor.valid',
                }
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
              target: '.editor',
            },
            'GO.TO.PUBLICATION': {
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
            'COMMIT.PUBLISH': {
              actions: [
                'removeDraftFromList',
                'asssignNewPublicationValues',
              ],
              target: '#routes.publication.valid',
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
      guards: {
        isMetaEventDifferent: (context, _, meta) => {
          let { type, ...eventParams } = meta.state.event
          return !isEqual(context.params, eventParams)
        },
        isEventDifferent: (context, event) => {
          let { type, ...eventParams } = event
          let result = !isEqual(context.params, eventParams)
          return result
        },
      },
      actions: {
        assignError: (_, event) => {

        },
        assignFiles: assign(function assignFilesPredicate(_, event, meta) {
          let draftList = event.draftList.map(function draftListMapper(draft) {
            let editor = buildEditorHook(plugins, EditorMode.Draft)
            return {
              ...draft,
              ref: spawn(
                createDraftMachine({ client, draft, editor }).withConfig({
                  services: {
                    publishDraft: (context) => {
                      debug('PUBLISH SERVICE!')
                      return publishDraft(context.documentId)
                    }
                  },
                  actions: {
                    afterPublish: sendParent((context, event) => ({
                      type: 'COMMIT.PUBLISH',
                      publication: event.data,
                      documentId: context.documentId
                    }))
                  }
                }),
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
                  createPublicationMachine({ client, publication, editor }),
                  getRefFromParams(
                    'pub',
                    publication.document!.id,
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

        setDraftAsCurrent: assign({
          currentFile: (context) => {
            let draft = context.draftList.find(
              (d) =>
                d.ref.id ==
                getRefFromParams('draft', context.params.docId, null),
            )
            return draft?.ref ?? null
          },
        }),
        setPublicationAsCurrent: assign({
          currentFile: (context) => {
            let publication = context.publicationList.find(
              (p) =>
                p.ref.id ==
                getRefFromParams(
                  'pub',
                  context.params.docId,
                  context.params.version,
                ),
            )
            return publication?.ref ?? null
          },
        }),
        openWindow: async (context, event) => {
          openWindow(event.path)
        },
        pushToRecents: assign(({ currentFile, recents }) => {
          if (currentFile) {
            let _set = new Set<typeof currentFile>(recents)
            if (_set.has(currentFile)) _set.delete(currentFile)
            _set.add(currentFile)
            return {
              recents: [..._set].reverse(),
            }
          } else {
            return {}
          }
        }),
        clearCurrentFile: assign({
          currentFile: (c) => null,
        }),
        setDraftParams: assign({
          params: (_, e, meta) => {
            let { event } = meta.state
            return {
              docId: event.docId,
              replace: event.replace,
            }
          },
        }),
        setPublicationParams: assign({
          params: (c, e, meta) => {
            let { event } = meta.state
            return {
              docId: event.docId,
              version: event.version,
              blockId: event.blockId,
              replace: event.replace,
            }
          },
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
          { to: 'router' },
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
          { to: 'router' },
        ),
        pushSettings: send(
          {
            type: 'pushSettings',
          },
          { to: 'router' },
        ),
        clearParams: assign((_) => ({
          params: {
            docId: '',
            version: null,
            blockId: null,
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
          { to: 'router' },
        ),
        pushPublicationListRoute: send(
          {
            type: 'pushPublicationList',
          },
          { to: 'router' },
        ),
        editPublication: (_, event) => {
          createDraft(event.docId).then((doc) => {
            openWindow(`/editor/${doc.id}`)
          })
        },
        updateDraftList: assign((context, event) => {
          let draftId = getRefFromParams('draft', event.documentId, null)
          debug('UPDATE DRAFTLIST', draftId)
          return {
            draftList: context.draftList.filter((d) => d.ref.id != draftId),
          }
        }),
        updatePublicationList: assign((context, event) => {
          let pubId = getRefFromParams('pub', event.documentId, event.version)
          debug('UPDATE PUBLIST', pubId)
          return {
            publicationList: context.publicationList.filter(
              (p) => p.ref.id != pubId,
            ),
          }
        }),
        removeFileFromRecentList: assign({
          recents: (context, event) =>
            context.recents.filter((ref) => !ref.id.includes(event.documentId)),
        }),
        assignNewDraftValues: assign((context, event) => {
          let editor = buildEditorHook(plugins, EditorMode.Draft)
          let draftRef = spawn(
            createDraftMachine({ client, editor, draft: event.data as Document }).withConfig({
              services: {
                publishDraft: (context) => {
                  return publishDraft(context.documentId)
                }
              },
              actions: {
                afterPublish: (context, event) => {
                  sendParent<MainPageContext, MainPageEvent>({
                    type: 'COMMIT.PUBLISH',
                    publication: event.data,
                    documentId: context.documentId
                  })
                }
              }
            }),
            getRefFromParams('draft', event.data.id, null),
          )
          return {
            params: {
              docId: event.data.id,
              replace: true,
              version: null,
              blockId: null,
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
        asssignNewPublicationValues: assign((context, event) => {
          debug('asssignNewPublicationValues', event)
          let editor = buildEditorHook(plugins, EditorMode.Publication)
          let publicationRef = spawn(
            createPublicationMachine({
              client,
              publication: event.publication,
              editor,
            }),
            getRefFromParams(
              'pub',
              event.publication.document!.id,
              event.publication.version,
            ),
          )

          return {
            params: {
              docId: event.publication.document?.id,
              version: event.publication.version,
              blockId: null,
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
            debug('REMOVE DRAFT:', ref)
            return context.draftList.filter((d) => d.ref.id != ref)
          },
        }),
      },
      services: {
        fetchFiles: () => (sendBack, receive) => {
          Promise.all([
            client.fetchQuery([queryKeys.GET_PUBLICATION_LIST], () =>
              listPublications(),
            ),
            client.fetchQuery([queryKeys.GET_DRAFT_LIST], () => listDrafts()),
          ])
            .then(function filesResponse([pubList, draftList]) {
              sendBack({
                type: 'REPORT.FILES.SUCCESS',
                publicationList: pubList.publications,
                draftList: draftList.documents,
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
            .on<{ docId: string }>('/editor/:docId', (params) => {
              return params
                ? sendBack({ type: 'GO.TO.DRAFT', ...params })
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
                  version: params.version,
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
              let { pathname } = window.location
              let newRoute = `/p/${event.docId}${event.version
                ? `/${event.version}${event.blockId ? `/${event.blockId}` : ''
                }`
                : ''
                }`
              if (pathname != newRoute) {
                navRouter.route(newRoute, event.replace)
              }
            } else if (event.type == 'pushDraft') {
              let { pathname } = window.location
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
        }
      },

    },
  )
}

function openWindow(path?: string) {
  if (path) {
    // Open window with path
    tauriInvoke('plugin:window|open', { path })
  } else {
    createDraft().then((doc) => {
      let path = `/editor/${doc.id}`
      // open window with new path
      tauriInvoke('plugin:window|open', { path })
    })
  }
}
