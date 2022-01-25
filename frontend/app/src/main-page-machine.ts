import {libraryMachine} from '@components/library/library-machine'
import {ActorRefFrom, createMachine, spawn} from 'xstate'
import {createModel} from 'xstate/lib/model'
import {
  Document,
  listDrafts,
  ListDraftsResponse,
  listPublications,
  ListPublicationsResponse,
  Publication,
} from './client'

export type PublicationRef = Publication & {
  ref: ActorRefFrom<ReturnType<typeof createPublicationMachine>>
}

let filesModel = createModel(
  {
    data: [] as Array<PublicationRef>,
  },
  {
    events: {
      'REPORT.DATA.SUCCESS': (data: Array<PublicationRef>) => ({data}),
      RECONCILE: () => ({}),
    },
  },
)

export let filesMachine = filesModel.createMachine({
  initial: 'idle',
  context: filesModel.initialContext,
  states: {
    idle: {
      invoke: [
        {
          src: () => (sendBack) => {
            listPublications().then(function filesResponse(response: ListPublicationsResponse) {
              console.log('publications: ', response.publications)

              let items = response.publications.map((pub) => ({
                ...pub,
                ref: spawn(createPublicationMachine(pub), `publication-${pub.document?.id}`),
              }))
              sendBack(filesModel.events['REPORT.DATA.SUCCESS'](items))
            })
          },
        },
      ],
      on: {
        'REPORT.DATA.SUCCESS': {
          actions: filesModel.assign({
            data: (_, event) => event.data,
          }),
          target: 'ready',
        },
      },
    },
    ready: {
      on: {
        RECONCILE: 'idle',
      },
    },
  },
})

export type DraftRef = Document & {
  ref: string // TODO: ActorRefFrom<ReturnType<typeof createDraftMachine>>
}

let draftsModel = createModel(
  {
    data: [] as Array<DraftRef>,
  },
  {
    events: {
      'REPORT.DATA.SUCCESS': (data: Array<DraftRef>) => ({data}),
      RECONCILE: () => ({}),
    },
  },
)

export let draftsMachine = draftsModel.createMachine({
  initial: 'idle',
  context: draftsModel.initialContext,
  states: {
    idle: {
      invoke: [
        {
          src: () => (sendBack) => {
            listDrafts().then(function filesResponse(response: ListDraftsResponse) {
              let items = response.documents.map((doc) => ({
                ...doc,
                ref: 'TODO',
              }))
              sendBack(draftsModel.events['REPORT.DATA.SUCCESS'](items))
            })
          },
        },
      ],
      on: {
        'REPORT.DATA.SUCCESS': {
          actions: draftsModel.assign({
            data: (_, event) => event.data,
          }),
          target: 'ready',
        },
      },
    },
    ready: {
      on: {
        RECONCILE: 'idle',
      },
    },
  },
})

let publicationModel = createModel(
  {
    document: undefined as Document | undefined,
    version: '',
    latestVersion: '',
  },
  {
    events: {},
  },
)

export function createPublicationMachine(publication: Publication) {
  return publicationModel.createMachine({
    id: `publication-${publication.document?.id}`,
    context: {
      ...publication,
    },
  })
}

export let mainPageMachine = createMachine({
  initial: 'idle',
  context: () => ({
    files: spawn(filesMachine, 'files'),
    drafts: spawn(draftsMachine, 'drafts'),
    library: spawn(libraryMachine, 'library'),
  }),
  states: {
    idle: {},
  },
})
