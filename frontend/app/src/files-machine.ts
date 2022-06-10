import { Document, listDrafts } from '@app/client'
import { createDraftMachine } from '@app/draft-machine'
import { buildEditorHook, EditorMode } from '@app/editor/plugin-utils'
import { plugins } from '@app/editor/plugins'
import { queryKeys } from '@app/hooks'
import { getRefFromParams } from '@app/main-page-context'
import { DraftRef, PublicationRef } from '@app/main-page-machine'
import { createPublicationMachine } from '@app/publication-machine'
import { debug, error } from '@app/utils/logger'
import { QueryClient } from 'react-query'
import { ActorRefFrom, assign, createMachine, spawn } from 'xstate'
import { listPublications, Publication } from './client'

export type PublicationWithRef = Publication & {
  ref: ActorRefFrom<ReturnType<typeof createPublicationMachine>>
}

export type DraftWithRef = Document & {
  ref: ActorRefFrom<ReturnType<typeof createDraftMachine>>
}

type RefId = string

export type FilesContext = {
  publicationList: Array<PublicationWithRef>
  draftList: Array<DraftWithRef>
  errorMessage: string
  currentFile: PublicationRef | DraftRef | null
  queue: Array<RefId>
}

export type FilesEvent =
  | {
    type: 'REPORT.FILES.SUCCESS'
    publicationList: Array<Publication>
    draftList: Array<Document>
  }
  | { type: 'REPORT.FILES.ERROR'; errorMessage: string }
  | { type: 'RECONCILE' }
  | { type: 'COMMIT.PUBLICATION'; publication: Publication }

export function createFilesMachine(client: QueryClient) {
  /** @xstate-layout N4IgpgJg5mDOIC5QDMCWAbOBaAtgQwGMALVAOzADpUJMBiAJQFEAFAeXoBUKARAQQ94UAygFUAwmMZChiUAAcA9rFQAXVAtKyQAD0QAmAMwAGCgFYALAEYAbNb2WDATj2nTj0wBoQAT32PHZgamRo4A7MHWABzmrgC+sV5omLC4hCTkFABOYHgQ3gyMYqwAcmIAkgAyjFqKymoaWroIBpYmjlGh1qbWlu7WoZbmXr4IlpF6FP7+XaFG5pHWQebxiRjY+MRklNm5+QBilVIUFay83BTMIgBCFWVi-GUlNUqq6ppIOojm5tYUBv1jSKmMa2ULmAzDRBjCZTMJGOzRPR6MErEBJdZpLa0A5VITHU7nS43O4PJ4fWqvBofJp6H4UKJBRzmFyOAxssGQ0Z6eIJECkBQQOBadEpDbpSjUTDPOpvRqILBjAwUcZRdrzWaOQbWTl6SIBUxBEJWSyWXVg5a8kWpTYZHZ5aWU96gJoxUwUebjUJ6VlGSLjSI6sGTKYGrrwgy01FWsVbB31J2fBBYPRGULKvSq6zqkJazmtAKw8xGUyhUts6I82JAA */
  return createMachine(
    {
      context: {
        currentFile: null,
        publicationList: [],
        draftList: [],
        errorMessage: '',
        queue: [],
      },
      tsTypes: {} as import('./files-machine.typegen').Typegen0,
      schema: {
        context: {} as FilesContext,
        events: {} as FilesEvent,
      },
      id: 'files-machine',
      initial: 'idle',
      states: {
        idle: {
          invoke: {
            src: 'fetchFiles',
            id: 'fetchFiles',
          },
          on: {
            'REPORT.FILES.SUCCESS': {
              actions: ['assignData'],
              target: 'ready',
            },
            'REPORT.FILES.ERROR': {
              actions: ['assignError'],
              target: 'errored',
            },
          },
        },
        ready: {
          entry: ['notifyParent'],
          on: {
            RECONCILE: {
              actions: 'clearCache',
              target: 'idle',
            },
            'COMMIT.PUBLICATION': {
              actions: ['addPublication'],
            },
          },
        },
        errored: {},
      },
    },
    {
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
      },
      actions: {
        addPublication: assign({
          publicationList: (context, event) => {
            return [
              ...context.publicationList,
              {
                ...event.publication,
                ref: spawn(
                  createPublicationMachine(client, event.publication),
                  `pub-${event.publication.document!.id}-${event.publication.version
                  }`,
                ),
              },
            ]
          },
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        assignData: assign({
          draftList: (_, event) => {
            return event.draftList.map((draft) => {
              let editor = buildEditorHook(plugins, EditorMode.Draft)
              return {
                ...draft,
                ref: spawn(
                  createDraftMachine({ client, editor, draft }),
                  getRefFromParams('draft', draft.id, null),
                ),
              }
            })
          },
          publicationList: (_, event) => {
            return event.publicationList.map((pub) => ({
              ...pub,
              ref: spawn(
                createPublicationMachine(client, pub),
                getRefFromParams('pub', pub.document!.id, pub.version),
              ),
            }))
          },
        }),
        clearCache: () => {
          client.invalidateQueries([queryKeys.GET_PUBLICATION_LIST])
        },
        clearQueue: assign((context) => {
          let { queue } = context
          let set = new Set(queue)
          var fileRef

          set.forEach((ref) => {
            if (ref.startsWith('pub-')) {
              fileRef = context.publicationList.find(
                (file) => file.ref.id == ref,
              )?.ref
              debug('IS PUBLICATION', fileRef)
            } else {
              debug('CLEARQUEUE setting currentFile')
              fileRef = context.draftList.find(
                (file) => file.ref.id == ref,
              )?.ref
            }
          })
          return {
            queue: [],
            currentFile: fileRef || null,
          }
        }),
        addToQueue: assign({
          queue: (context, event) => {
            return [...context.queue, event.ref]
          },
        }),
        assignDraftToCurrentFile: assign({
          currentFile: (context, event) => {
            let file = context.draftList.find((d) => d.ref.id == event.ref)?.ref
            if (file) {
              return file
            } else {
              error(
                'assignDraftToCurrentFile: draft not found',
                event.ref,
                context.draftList,
              )
              return null
            }
          },
        }),
        assignPublicationCurrentFile: assign({
          currentFile: (context, event) => {
            let file = context.publicationList.find(
              (d) => d.ref.id == event.ref,
            )?.ref
            if (file) {
              return file
            } else {
              error(
                'assignPublicationCurrentFile: Publication not found',
                event.ref,
                context.publicationList,
              )
              return null
            }
          },
        }),
      },
    },
  )
}
