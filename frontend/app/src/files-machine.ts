import { Document, listDrafts } from '@app/client'
import { queryKeys } from '@app/hooks'
import { getRefFromParams } from '@app/main-page-context'
import { createPublicationMachine } from '@app/publication-machine'
import { QueryClient } from 'react-query'
import { ActorRefFrom, assign, createMachine, send, spawn } from 'xstate'
import { listPublications, Publication } from './client'

export type PublicationWithRef = Publication & {
  ref: ActorRefFrom<ReturnType<typeof createPublicationMachine>>
}

export type DraftWithRef = Document & {
  ref: any // TODO: ActorRefFrom<ReturnType<typeof createDraftMachine>>
}

type RefId = string

export type FilesContext = {
  publicationList: Array<PublicationWithRef>
  draftList: Array<DraftWithRef>
  queue: Array<RefId>
  errorMessage: string
}

export type FilesEvent =
  | {
    type: 'REPORT.DATA.SUCCESS'
    publicationList: Array<Publication>
    draftList: Array<Document>
  }
  | { type: 'REPORT.DATA.ERROR'; errorMessage: string }
  | { type: 'RECONCILE' }
  | { type: 'LOAD.PUBLICATION'; ref: string }
  | { type: 'LOAD.DRAFT'; ref: string }
  | { type: 'COMMIT.PUBLICATION', publication: Publication }

export function createFilesMachine(client: QueryClient) {
  /** @xstate-layout N4IgpgJg5mDOIC5QDMCWAbOBaAtgQwGMALVAOzADpUJMBiAJQFEAFAeXoBUKARAQQ94UAygFUAwmMZChiUAAcA9rFQAXVAtKyQAD0QAmAMwAGCgFYALAEYAbNb2WDATj2nTj0wBoQAT32PHZgamRo4A7MHWABzmrgC+sV5omLC4hCTkFABOYHgQ3gyMYqwAcmIAkgAyjFqKymoaWroIBpYmjlGh1qbWlu7WoZbmXr4IlpF6FP7+XaFG5pHWQebxiRjY+MRklNm5+QBilVIUFay83BTMIgBCFWVi-GUlNUqq6ppIOojm5tYUBv1jSKmMa2ULmAzDRBjCZTMJGOzRPR6MErEBJdZpLa0A5VITHU7nS43O4PJ4fWqvBofJp6H4UKJBRzmFyOAxssGQ0Z6eIJECkBQQOBadEpDbpSjUTDPOpvRqILBjAwUcZRdrzWaOQbWTl6SIBUxBEJWSyWXVg5a8kWpTYZHZ5aWU96gJoxUwUebjUJ6VlGSLjSI6sGTKYGrrwgy01FWsVbB31J2fBBYPRGULKvSq6zqkJazmtAKw8xGUyhUts6I82JAA */
  return createMachine(
    {
      context: {
        publicationList: [],
        draftList: [],
        queue: [],
        errorMessage: '',
      },
      tsTypes: {} as import('./files-machine.typegen').Typegen0,
      schema: {
        context: {} as FilesContext,
        events: {} as FilesEvent,
      },
      id: 'files-machine',
      initial: 'idle',
      on: {
        'LOAD.PUBLICATION': {
          actions: 'addToQueue',
        },
        'LOAD.DRAFT': {
          actions: 'addToQueue',
        },
      },
      states: {
        idle: {
          invoke: {
            src: 'fetchFiles',
            id: 'fetchFiles',
          },
          on: {
            'REPORT.DATA.SUCCESS': {
              actions: ['assignData'],
              target: 'ready',
            },
            'REPORT.DATA.ERROR': {
              actions: ['assignError'],
              target: 'errored',
            },
          },
        },
        ready: {
          entry: 'clearQueue',
          on: {
            RECONCILE: {
              actions: 'clearCache',
              target: 'idle',
            },
            "COMMIT.PUBLICATION": {
              actions: ['addPublication']
            }
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
                type: 'REPORT.DATA.SUCCESS',
                publicationList: pubList.publications,
                draftList: draftList.documents,
              })
            })
            .catch((error) => {
              sendBack({
                type: 'REPORT.DATA.ERROR',
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
                ref: spawn(createPublicationMachine(client, event.publication), `pub-${event.publication.document!.id}-${event.publication.version}`)
              }
            ]
          }
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        assignData: assign({
          draftList: (_, event) => {
            return event.draftList.map((draft) => ({
              ...draft,
              ref: null,
            }))
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
          set.forEach((ref) => send('LOAD', { to: ref }))
          return {
            queue: [],
          }
        }),
        addToQueue: assign({
          queue: (context, event) => {
            return [...context.queue, event.ref]
          },
        }),
      },
    },
  )
}
