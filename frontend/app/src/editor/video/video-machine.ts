import {assign, createMachine} from 'xstate'

type VideoContext = {
  errorMessage: string
  captionVisibility: boolean
}

type VideoEvent =
  | {type: 'VIDEO.REPLACE'}
  | {type: 'VIDEO.SUBMIT'; value: string}
  | {type: 'REPORT.VIDEO.VALID'}
  | {type: 'REPORT.VIDEO.INVALID'}
  | {type: 'CAPTION.UPDATE'; value: string}

type VideoServices = {
  validateUrlService: {
    data: string | undefined
  }
}

export const videoMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QDUCWEwHsAEBZAhgMYAWqAdmAHTmoAuAxIqAA6ax2qZlMgAeiAJgCcAZkoBGEQHYhABikA2BQA4By5SIA0IAJ6IALOPESFs2cv371yqVJEBfe9rQYcBEuSoA3dFnrIASQARAFEAeUoAJRCABQAZAEEAYRCeVnZaTm4kPkQhFUoNAFYhIrsBIuVZfSFtPQR9KX1KIrMzESMiqxEFIsdnXzciUgpKH1d6JISYgBUAsIA5SgBVGKCEmdSc9I4uHn4EO2VCovFKtSEBCoV9OsQRVsohZ9KpU4VJCr6nEBcsPGGnkokDof0w-mC4UoAGVlgAhXABGZpNi7bKgA5CGRPFRSDRCGyyISGO4IORPF5SK76EQ2ETCfq-QYAjyjWAAVwARgBbOiZMhQegQLhUcheTAAa28+AANuh8LQwMsAE4y6FgZU+QhgFEZLL7AxFIoSKTiCxGyynZQKUnCKSUGovWTSZ0CET6RlglkjKgcnl88iCjXKzDKyjMGUKgBmoe5Y1l8sVKrVGq1Ou2qMyexyB30RpNZrzXTzZptukE4lkDpeCgE1VsJccPzImAw8ByXvcPuoZDourRBoQRgElGEZiUprkNXEAlJ+gKrTaChkTTNdk9zK7QPGWH7WfRuQQKjEjV6RTdzpsZrn+hHLwJlVppvMUg3rm9QJBtDBe-1OcQRjSE8Fi3ooMjPEUZb1FcCjVhB84aDYjQOD8naAmyXK8rQ-JQL+2YYgYs7lggAjzpQTTPI06g3EaxJvv8W4UHhB4HNexHiPa97COIogWgIShNvYQA */
  createMachine(
    {
      tsTypes: {} as import('./video-machine.typegen').Typegen0,
      schema: {context: {} as VideoContext, events: {} as VideoEvent},
      id: 'Video Machine',
      initial: 'init',
      states: {
        init: {
          always: [
            {
              cond: 'hasVideoUrl',
              target: 'video',
            },
            {
              target: 'editVideo',
            },
          ],
        },
        video: {
          entry: 'assignCaptionVisibility',
          on: {
            'VIDEO.REPLACE': {
              target: 'editVideo',
            },
            'CAPTION.UPDATE': {
              actions: 'updateCaption',
            },
          },
        },
        editVideo: {
          on: {
            'VIDEO.SUBMIT': {
              target: 'submitting',
            },
          },
        },
        submitting: {
          entry: 'clearError',
          invoke: {
            src: 'validateUrlService',
            id: 'validateUrlService',
            onDone: [
              {
                actions: ['assignValidUrl', 'enableCaption'],
                target: 'video',
              },
            ],
            onError: [
              {
                actions: 'assignError',
                target: 'editVideo',
              },
            ],
          },
        },
      },
    },
    {
      actions: {
        clearError: assign({
          errorMessage: (c) => '',
        }),
        enableCaption: assign({
          captionVisibility: (c) => true,
        }),
      },
    },
  )
