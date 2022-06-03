import { Publication } from '@app/client'
import { EditorDocument } from '@app/editor/use-editor-draft'
import { GetBlockResult } from '@app/utils/get-block'
import { assign, createMachine } from 'xstate'

export type ClientPublication = Omit<Publication, 'document'> & {
  document: EditorDocument
}

export type PublicationContext = {
  docId: string
  version: string
  publication: ClientPublication | null
  errorMessage: string
  canUpdate: boolean
  discussion: Array<GetBlockResult>
}

export type PublicationEvent =
  { type: 'LOAD' }
  | { type: 'UNLOAD' }
  | { type: 'PUBLICATION.FETCH.DATA' }
  | {
    type: 'PUBLICATION.REPORT.SUCCESS'
    publication: ClientPublication
    canUpdate?: boolean
  }
  | { type: 'PUBLICATION.REPORT.ERROR'; errorMessage: string }
  | { type: 'DISCUSSION.FETCH.DATA' }
  | { type: 'DISCUSSION.SHOW' }
  | { type: 'DISCUSSION.HIDE' }
  | { type: 'DISCUSSION.TOGGLE' }
  | { type: 'DISCUSSION.REPORT.SUCCESS'; discussion: Array<GetBlockResult> }
  | { type: 'DISCUSSION.REPORT.ERROR'; errorMessage: string }

export const publicationMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAjANgSwMYEMAXbAewDsBaAW31wAtsywA6CbWXVWWUs57CJjABiRChI9i5MSAAeiAEwA2ACzMlCgAwBOBQGYA7CoCsC43oAcAGhABPRHpVqLezWeMWlxldr1eAvv42aFh4RLzUtAxMrOyc3LzMAGZghPSMUMIAIgCSAMoAwgCqeXk5APIAcswASgCiAArlNQAqzHU1Nc0yyBLYUmQy8ggKAIxKzL4GxhoqBhbKFip6NvYIowaazJo7mqNLWtpuxoHBGDgEA5HpMWwcXDzkyak3mbmFJWVVtY3NbXlFAoFOqlHp9AZDRALVaIJQGCbGXb7bTGUYmCwnIIgEIXcLka7RFh3eKPPgAJzA+AgtmYDAgEDAZGy+WKpQq1TyAAlygB1MGSXiQhDGVHMCzaJY+cWGCwGGEIJTaCa7NzaI5jPR6BSnbHnMJXGg3IlxB6JClUml0hlM96sr7VFrlADiToAMnV+f1BUg5IgRaMxRKnBKprL5UY1CrNUpDAo5jqcfqIobCbF7gknubqcwAG7sbBYES2z7s5icnJZD0+3oC6Q+4bGAwGZg+NUWNHaFRaTzh3TbXaGWN+UYJvWXZNRRjG9Ok5hZml5niF5kfNnfR0u92eiH1v2i8WSkMyuV2WEqCz9nbKcabUa+Uehcf4lNTtMkxJgMlkkgUiAru2lgAYnULQFJyzBZAAgi0kHbt6oDDGMExTDMcbzIsyzymYzYqhsejGNoBhHEoD64gak4xImT58AIQjCK65SQVkcF1ghih3pMbamEY3i6E28qjFqzaKkoGxGEoSiyk4pFJs+FEsFReJ8J+36-sIDRFAAQq6OQFNBQEgWBEHQbB1bgvBvrCgoF6oiKFh7PMMZ+PKIaXpoEn6CoSiaNJWKKeRRrMP5iQpGk0SZBp2m6fp3z1E0rTMACQIgnkLGDLuwrudseijMiaI5eYhgCQo0xijGTg6Bi54uDJ1EEq+wVPKFrzqVpOl6S0pZxX87SdN0Zm1ulbEIOeyFqiiuiFZoWrGAJow+ZxbYldNsokX5Y5KfVlEbQMc6UtSwhFJUDFMWlQoWAszAEaM5hNpoBh6L4s2nus+XqE2XZ3QocadoEWJkCQDLwNWO0ToFxKmk8tFgGdGUGAoWFqm5+z4fD+EWLVm0vrcJoZnwzXhbDw1zGoRjfZ4XiqiKJ5rEhblaOi+gPSomMBamEN43tFq0gI1pE5ZlgXpJ0z3XMbgldYL1eBMWg7DlUo+SKrNg+zuOzvOub5oW-PDPC2jMMz+GGE28LffKIktgOnhKhonjK3J4Nq2a+1rOIg1Cn4ajC4iRibN98zyo2xhuXs00SuKa1nI+WPyW+kPKV+P6QDriDwwJRxipqjhqt9Pn3ut0ds6+HOkinI2S2shFuajlhxp4LMF2RKsNaDUOCDDA1eqxlmXV5sqWEqTh+NZxWKuocIXRJd5GLo9uUNjCmtwnqnJ53O7DXdkzebo+z2csKwvfNyiZ5qJv6PsI6N7J8+x41+MvITa8WbrCOHzs+tmDsuULPd9dz1ti9C7OwtGXTeSodBjAuj5TUxUFD6xVKoNE7l4QYyvnVBeQUl5l3PC5cYblGyGHGAsbQ-8F5lzjFhSMA4nAigHoYP6-ggA */
  createMachine(
    {
      context: {
        docId: '',
        version: '',
        publication: null,
        errorMessage: '',
        canUpdate: false,
        discussion: [],
      },
      tsTypes: {} as import('./publication-machine.typegen').Typegen0,
      schema: { context: {} as PublicationContext, events: {} as PublicationEvent },
      type: 'parallel',
      id: 'publication-machine',
      states: {
        discussion: {
          initial: 'idle',
          states: {
            idle: {
              always: {
                target: 'fetching',
              },
            },
            fetching: {
              invoke: {
                src: 'fetchDiscussionData',
                id: 'fetchDiscussionData',
              },
              on: {
                'DISCUSSION.REPORT.ERROR': {
                  actions: 'assignError',
                  target: 'errored',
                },
                'DISCUSSION.REPORT.SUCCESS': {
                  actions: 'assignDiscussion',
                  target: 'ready',
                },
              },
            },
            ready: {
              initial: 'hidden',
              states: {
                hidden: {
                  on: {
                    'DISCUSSION.SHOW': {
                      target: 'visible',
                    },
                    'DISCUSSION.TOGGLE': {
                      target: 'visible',
                    },
                  },
                },
                visible: {
                  on: {
                    'DISCUSSION.HIDE': {
                      target: 'hidden',
                    },
                    'DISCUSSION.TOGGLE': {
                      target: 'hidden',
                    },
                  },
                },
              },
            },
            errored: {
              on: {
                'DISCUSSION.FETCH.DATA': {
                  target: 'fetching',
                },
              },
            },
          },
        },
        publication: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                LOAD: [
                  {
                    cond: 'isCached',
                    target: 'ready',
                  },
                  {
                    target: 'fetching',
                  },
                ],
              },
            },
            errored: {
              on: {
                'PUBLICATION.FETCH.DATA': {
                  actions: ['clearError', 'clearDiscussion'],
                  target: 'fetching',
                },
              },
            },
            fetching: {
              invoke: {
                src: 'fetchPublicationData',
                id: 'fetchPublicationData',
              },
              tags: 'pending',
              on: {
                'PUBLICATION.REPORT.SUCCESS': {
                  actions: ['assignPublication', 'assignCanUpdate'],
                  target: 'ready',
                },
                'PUBLICATION.REPORT.ERROR': {
                  actions: 'assignError',
                  target: 'errored',
                },
              },
            },
            ready: {
              on: {
                UNLOAD: {
                  target: 'idle',
                },
              },
            },
          },
        },
      },
    },
    {
      guards: {
        isCached: () => false,
      },
      actions: {
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        assignCanUpdate: assign({
          canUpdate: (_, event) => Boolean(event.canUpdate),
        }),
        assignDiscussion: assign({
          discussion: (_, event) => event.discussion,
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        clearDiscussion: assign({
          discussion: (context) => null,
        }),
        clearError: assign({
          errorMessage: (context) => '',
        }),
      },
    },
  )