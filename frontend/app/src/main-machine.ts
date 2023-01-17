import {createDraft, Document} from '@mintter/shared'
import {DraftActor} from '@app/draft-machine'
import {PublicationActor} from '@app/publication-machine'
import {openWindow} from '@app/utils/open-window'
import {invoke} from '@tauri-apps/api'
import {assign, createMachine} from 'xstate'

type MainMachineContext = {
  current: PublicationActor | DraftActor | null
  errorMessage: string
}

type MainMachineEvent =
  | {
      type: 'COMMIT.OPEN.WINDOW'
      path?: string
    }
  | {
      type: 'COMMIT.CURRENT.PUBLICATION'
      service: PublicationActor
    }
  | {
      type: 'COMMIT.CURRENT.DRAFT'
      service: DraftActor
    }
  | {type: 'COMMIT.NEW.DRAFT'}

type MainMachineServices = {
  createDraft: {
    data: Document
  }
}

export var mainMachine = createMachine(
  {
    id: 'main-machine',
    predictableActionArguments: true,
    tsTypes: {} as import('./main-machine.typegen').Typegen0,
    schema: {
      context: {} as MainMachineContext,
      events: {} as MainMachineEvent,
      services: {} as MainMachineServices,
    },
    context: {
      current: null,
      errorMessage: '',
    },
    initial: 'idle',
    states: {
      idle: {},
      createNewDraft: {
        invoke: {
          src: 'createDraft',
          id: 'createDraft',
          onDone: {
            target: 'idle',
            actions: ['refetchDraftList', 'navigateToDraft'],
          },
          onError: {
            actions: ['assignError'],
            target: 'idle',
          },
        },
      },
    },
    on: {
      'COMMIT.OPEN.WINDOW': {
        actions: ['openWindow'],
      },
      'COMMIT.CURRENT.PUBLICATION': {
        actions: ['assignCurrent'],
      },
      'COMMIT.CURRENT.DRAFT': {
        actions: ['assignCurrent'],
      },
      'COMMIT.NEW.DRAFT': 'createNewDraft',
    },
  },
  {
    actions: {
      openWindow: (_, event) => {
        openWindow(event.path)
      },
      assignCurrent: assign({
        current: (_, event) => event.service,
      }),
      assignError: assign({
        errorMessage: (c, event) => JSON.stringify(event),
      }),
      refetchDraftList: () => {
        invoke('emit_all', {
          event: 'new_draft',
        })
      },
    },
    services: {
      createDraft: () => createDraft(),
    },
  },
)
