import {DraftActor} from '@app/draft-machine'
import {PublicationActor} from '@app/publication-machine'
import {openWindow} from '@app/utils/open-window'
import {assign, createMachine} from 'xstate'

type MainMachineContext = {
  current: PublicationActor | DraftActor
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

export var mainMachine = createMachine(
  {
    id: 'main-machine',
    predictableActionArguments: true,
    tsTypes: {} as import('./main-machine.typegen').Typegen0,
    schema: {
      context: {} as MainMachineContext,
      events: {} as MainMachineEvent,
    },
    initial: 'idle',
    states: {
      idle: {},
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
    },
  },
)
