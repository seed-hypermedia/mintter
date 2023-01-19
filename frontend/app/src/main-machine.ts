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

export var mainMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QFsCGBLAdgWjQYwAsswBiAYQHkBZKgSQBUA6CgBQFEA5RgdVo4BEK3ANoAGALqJQABwD2sdABd0szFJAAPRAGZtoxqIAsANgAcxgEzGAnKICsAdgfaHAGhABPRNgsBGAw6m1g52FobWdo6Gpg4AvrHuaFi4qITE5NR0TGQAqgBKeZxMLDkAQgAytGQAgvS0FBxikkggcgrKqupaCHYmjIZ2ota+hhbB2hZG7l4IA-6+2oZOxiHWFtrB8YkYOPhEmKSUNAyMuQVFjPx51QBi9E3qbUoqai3dtozapqaippOGJgiojcnkQc0YCyWDhWdjWGziCRASV2qX2h0yJw4bG4l2udweLSeHVeoG6dlMjAsDgGLhi1hWQ2M00QvlCBlEK2pDmG0I2Fi2SJ2KTSB0YeAATmBUIowBwwAB3fji1AAM0UJAgqjAjCwADdZABrbUSqUypWqxQEmTyZ6dN6ICymOyfVlGUSTL7c3zMhC6awQ1k-URGXzOdYC5HCtFiyXS2UK81qkhgcXi2TixjSAA20pV6eQMdNYETlokjxtxK6OkCjGMvkZ5Mm63WPoWFN8oe0oT8Sy+dm08URmFkEDg6kje2I5faLyrCGwhkYpl8xi7Gx+5kmU1BPX0q7+Q0dVnJdYjQsnovQECzYGntpJmkQ1MXdmMgychlE9cGph9k2MjDUn89IDAMPz8oiE6osQhZxnKirKmqd6VvaszaBCpjaMYJhfsMLjWPSf4uEu1h6DEr70iENiDrEQA */
  createMachine(
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
