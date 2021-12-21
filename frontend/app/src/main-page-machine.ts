import {Document, listPublications, ListPublicationsResponse, Publication} from '@mintter/client'
import {ActorRefFrom, createMachine, spawn} from 'xstate'
import {createModel} from 'xstate/lib/model'
import {sidebarMachine} from './components/sidebar/sidebar-machine'

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
    ready: {},
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

function createPublicationMachine(publication: Publication) {
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
    sidebar: spawn(sidebarMachine, 'sidebar'),
  }),
  states: {
    idle: {},
  },
})
