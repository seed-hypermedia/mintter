import {activityMachine} from '@app/activity-machine'
import {
  createDraft,
  Document,
  getDraft,
  getPublication,
  listDrafts,
  listPublications,
  Publication,
  updateDraftV2 as updateDraft,
} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {createDraftMachine} from '@app/draft-machine'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {queryKeys} from '@app/hooks'
import {link, paragraph, statement, text} from '@app/mttast'
import {createPublicationMachine} from '@app/publication-machine'
import {getRefFromParams} from '@app/utils/machine-utils'
import {QueryClient} from '@tanstack/react-query'
import {invoke as tauriInvoke} from '@tauri-apps/api'
import Navaid from 'navaid'
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
  | {type: 'NOT.EDITING'}

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
  /** @xstate-layout N4IgpgJg5mDOIC5QFsCGBLAdgWjQYwAsswA6AJwHsBXAFzhIIuTAGIBhAeQFkuBJAFRIARAKIAZEfxEkAYrwmJQABwqx0NdBUyKQAD0QAWAAxGSADgMB2AGw2D16wFZLjgMwAaEAE9EZowEYSS1cAgCZQlxdrUOsAX1jPNCxcVEJicmo6WBJIdQoyEnQIABtWESEBXgA5AHEdFTUNLR19BH9XV0cSRwBOMx7HCJcDAx6Pb0R-N1cSPtd-fx6e6w6h+MSMHHwiTFJKWnpcmnyciHUsKBIaLyULliqOQXLK2vrVc+akPUnrHoNzGK9fz2VxDcY+NqOAwzXqhRwOaJmfyWYHrEBJLapHZ7TKHM7HApHC4kTAUGgAAmut0wUBYz341TqXwaH20X1a-lslhIRmsZjMTl58Pa1k8EOBbhIIVCARsoSW4QMaIxKTSuwyB2yRxORJp7G4fEEAAUAKoAITEvAAygAJN6NTRs0AQ0LAmb+Iz8qFGP5+EaeDn9UwdJzWEYWAzORzKzaq7EarIkJRUABGxXQeFQTUwhRKrE4PAEJDYACURABBKQkMtGsQATXtrJaiFC0P+RkcRhRjn8SMcSIMYpbBlbsyifTDjn7cQS6Nj23S+0TybTGazjvIYCUxS8dwgWlIWAAbhQANakPBkMBZsAlrc7xvZ5sIP6mD1Q4y9Az8vpDtp97o+QWVxolcPwkRjZIF3VJd6BXdNM2zTdt13PUwDISgCm3LMADN8mQEhL2vOg7xQx9HWfCIQilXofR7HpXR6fw-1CUFgx7JE2PsQYlVnFVoJxTUk1TBD1y0MR0FgGhc1KfVC0EUQJCrOQFGZd4n3ZRBQ3MIwDE5SwzEsFxOVFCY2m-aweTdAUVmmJZIMxNVBMTCAyFQHCaAkqSZPzA0i0UyRpBUkRyM+UBWk6LoAhHJZlmcSxBzMxZIylPopx7BZgjMUIHLjRdcWyIibyENyPJYfd1WPM8LyvG8qjAAB3Er3JoUKnW+BAUTMEgrAM3SZWCIy-yjIIegS+Lst7EdcoEhM4BYEsOBNKsHkEGQlqqIQ2ufYFQj-FEZhcAYlgFViwOjPj5yxfLNRYGoOBIfgHptbgQrUh0wo63a-zGyzVhAv4bH7aEZuumCCruh6npIK1JAZWorW2zTzL2pLkVCEhrGBfkQlcSw5hyy6oLB5z5vux6HtNC1eDYSteA4KpLStfgkfCyYRz-YEGJ5GJLFCQyBjMPGLo2YmnLm2BIYp4QS3LGR+CZln3qbZHvqShiumMc7XBGOFfksUHxdgyXyehoRZfl1mvo5szGMCToLGiBK+2CQ342NqXoapy1aYZBmrY5G2XTAnpZjGfpWKmECQLdm6snYMtK2kKoRAAdRluWleUdSKNVoPEC-IIcfDCJlgY2PwdugtDRIDgjREKoSFT6ohA4VOA-Z7KSCokD33x-HEohHXuoFSMbF0+F7Ar0nJerot6RIb2abp-3lY0tnzMsYMDIMvSDN-W3olmfwIn5KaFhPmdRcc7FyoPQpMBPc8SBwsAaEIGR0FKeA19zjeue5NCeUvYUSegsJzQm188q7BYOhTCSZii4Xwi-N+H8v5wA7ggWwLFaKzD0siXW2UIjTylmacsbAADSmCpieh6npfkkZWwJQYixJEf0+RelcLFTkJDybrRLKncsJYtq-0+oHPomNPxuG-K+aELFgimD3j6FwYEwLtHiLOUkEAMFfH4iTHIGF8iQEwaxUOfhehC2RIDXWLFrC6R6uEAUvJ+aglRETG+cd6BFFKJgjo3J+gWE5FCfoOtLB-j5BjFw-QDK9j8FMfw08JYMCYGATBvxTCuidrpFE49HCcyMDEHq8wdZTnlFvXkiTjanDyAUbxqTRHtQ5L2DGLifTLGBAsJwnN7D-BWIsJYwQVijCvnOMW7sCrVIJAYzC1DkTclaUsLG+CulJS4V0MMHofysS7LYSpEztSEnxMSKkFxqHZUOt+JEFghZ8m6VYbuo9vwjkyTrPZQkDmTOJKSCkJyaTULcJZeEdggyWKnHc-4BkwxPPCJyV57joEz0mTqI5fyGk7R7BjIFYYQXzDBasvm5g5k0L+MieEbzEwHNmZKBZ7Tll5KSq6GYDFexgVdBZA28LZpVPgmuJCdSTGXyCO0SMdjwghHpcHFwsw4mtk9GBEYHKoFcomTyxCG4rwoVOWi5GMQ7F0PlYsP0noWL4KlEYECAReRYwFIq0ZHjK7LhEryjccD8gmMyTzPoXM-GLJYiESyfQ-g6xlAUqO5K4JOrVZ9Fk68OqugKUKkportkSpbAsDGmUuxdj8LYSBdqEVJNgG-DQNIf7Zw+o0xA8xQ4REZQED04Z2ic3fJjVsfJfhC35n0cN2RVViUwF5aS-LtUb2dlKYI4RBigjDAlTmQy8FInRkZCMPbhKrijQOySrUR0dRWBjP0+lDLGQcJzUE3IFgCk7JyQytgRb5uVUJVyLVB0+UwSObqPZfjfhcVOBYLEhRSj0vMaEKxIgjL0UbCZT6PKDt8fMKyMVFnxUHpMSF3QCm2HOa2eU4GrqQaEkVOgzUPK+OhD1bF0IT7wkMsxMy8JDpHrhKxAyhkzA9tmWYP8VgzG9iWIsNp0833gkQNzAIvwnAhDGgELhGjYhAA */
  return createMachine(
    {
      context: () =>
        ({
          params: {
            replace: false,
          },
          recents: [],
          publicationList: [],
          draftList: [],
          errorMessage: '',
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
            },
            home: {
              entry: 'clearParams',
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
              entry: ['pushDraftRoute', 'pushDraftToRecents'],
              initial: 'idle',
              states: {
                idle: {
                  tags: ['documentView', 'draft'],
                  on: {
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
                        'NOT.EDITING': {
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
                  on: {
                    'COMMIT.PUBLISH': {
                      actions: [
                        'removeDraftFromList',
                        'asssignNewPublicationValues',
                        'removeDraftFromRecents',
                      ],
                      target: '#main-machine.routes.publication',
                    },
                  },
                },
              },
            },
            publication: {
              entry: ['pushPublicationRoute', 'pushPublicationToRecents'],
              initial: 'idle',
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
              entry: ['clearParams', 'pushSettings'],
              tags: 'settings',
            },
            publicationList: {
              entry: ['clearParams', 'pushPublicationListRoute'],
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
              entry: ['clearParams', 'pushDraftListRoute'],
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
                  actions: 'assignNewDraftValues',
                  target: 'editor',
                },
                onError: {},
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
              actions: ['assignDraftParams', 'pushDraftToRecents'],
              target: '.editor',
            },
            'GO.TO.PUBLICATION': {
              actions: [
                'assignPublicationParams',
                'pushToActivity',
                'pushPublicationToRecents',
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
              target: '.createDraft',
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
            let docId =
              event.type == 'COMMIT.PUBLISH' ? event.documentId : event.docId
            let version =
              event.type == 'COMMIT.PUBLISH'
                ? event.publication.version
                : event.version
            let fileRef = getRefFromParams('pub', docId, version)
            let currentList = context.recents.filter((ref) => fileRef != ref)
            return [fileRef, ...currentList].splice(0, 9)
          },
        }),
        pushDraftToRecents: assign({
          recents: (context, event) => {
            let docId =
              event.type == 'GO.TO.DRAFT' ? event.docId : event.data.id
            let fileRef = getRefFromParams('draft', docId, null)
            let currentList = context.recents.filter((ref) => fileRef != ref)
            return [fileRef, ...currentList].splice(0, 9)
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
            publicationList: [
              {
                ...event.publication,
                ref: publicationRef,
              },
              ...context.publicationList,
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
          recents: (context, event) =>
            context.recents.filter((ref) => !ref.includes(event.documentId)),
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
                  new Date(b.document?.updateTime) -
                  new Date(a.document?.updateTime)
                )
              }),
              draftList: draftList.documents.sort((a, b) => {
                // @ts-ignore
                return new Date(b.updateTime) - new Date(a.updateTime)
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
        createNewDraft: async (context, event) => {
          if (event.type == 'COMMIT.EDIT.PUBLICATION') {
            return createDraft(context.params.docId)
          } else {
            return createDraft()
          }
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
          } catch (err) {
            throw Error(
              `[REPLYTO ERROR]: currentFile does not have a snapshot - ${JSON.stringify(
                err,
              )}`,
            )
          }

          let publication = await client.fetchQuery(
            [
              queryKeys.GET_PUBLICATION,
              context.params.docId,
              context.params.version,
            ],
            () =>
              getPublication(
                context.params.docId as string,
                context.params.version,
              ),
          )

          let currentUrl = `${MINTTER_LINK_PREFIX}${context.params.docId}/${context.params.version}`
          let doc = await createDraft()
          let block = statement([
            paragraph([
              text('RE: '),
              link(
                {
                  url: currentUrl,
                },
                [text(publication?.document?.title || currentUrl)],
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
                    setTitle: `RE: ${
                      publication?.document?.title || currentUrl
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
