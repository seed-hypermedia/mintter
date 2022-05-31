
import { Document, getDraft, Publication } from '@app/client'
import { blockNodeToSlate } from '@app/client/v2/block-to-slate'
import { changesService } from '@app/editor/mintter-changes/plugin'
import { queryKeys } from '@app/hooks'
import { useMainPage } from '@app/main-page-context'
import { createId, group, isEmbed, paragraph, statement, text } from '@mintter/mttast'
import { useMachine } from '@xstate/react'
import { useEffect } from 'react'
import { QueryClient, useQueryClient } from 'react-query'
import { Editor } from 'slate'
import { assign, createMachine, MachineOptionsFrom } from 'xstate'

export type EditorDocument = Partial<Document> & {
  id?: string
  content: any
}

export type EditorContext = {
  retries: number
  prevDraft: EditorDocument | null
  localDraft: EditorDocument | null
  errorMessage: string
  publication: Publication | null,
  canPublish: boolean
}

export type EditorEvent =
  | { type: 'FETCH'; documentId: string }
  | {
    type: 'EDITOR.REPORT.FETCH.SUCCESS'
    data: Document
  }
  | { type: 'EDITOR.REPORT.FETCH.ERROR'; errorMessage: Error['message'] }
  | { type: 'EDITOR.UPDATE'; payload: Partial<EditorDocument> }
  | { type: 'EDITOR.UPDATE.SUCCESS' }
  | { type: 'EDITOR.UPDATE.ERROR'; errorMessage: Error['message'] }
  | { type: 'EDITOR.CANCEL' }
  | { type: 'EDITOR.PUBLISH' }
  | { type: 'EDITOR.PUBLISH.SUCCESS'; publication: Publication }
  | { type: 'EDITOR.PUBLISH.ERROR'; errorMessage: Error['message'] }
  | {
    type: 'EDITOR.MIGRATE'
  }
  | {
    type: 'RESET.CHANGES'
  }

interface DraftEditorMachineProps {
  client: QueryClient
  mainPageService: ReturnType<typeof useMainPage>
  shouldAutosave: boolean
  editor: Editor
}

const defaultContent = [
  group({ data: { parent: '' } }, [
    statement({ id: createId() }, [paragraph([text('')])]),
  ]),
]

export function draftEditorMachine({
  client,
  mainPageService,
  shouldAutosave = true,
  editor,
}: DraftEditorMachineProps) {
  /** @xstate-layout N4IgpgJg5mDOIC5SQJYBcD2AnAdCiANmAMSKgAOGs6KGAdmSAB6ICMAbOzgMwCcA7AAZu3dr1YAWQewBMAVgA0IAJ5sZvOTgAc-dhIm9BM-iOkBfM0tSZcYLFmyRiAMQCiAFQDCACUaVqaLQMSMxsWprcwnJaMez8rDqKKmxCmnISrKyCcrzG6oJaFlYQ6Ng4AGZgaADGABYodFDErgAiAJLuAPIASjieAIIAcp6uADJ+VDT0jCwIHFx8QiJiktLySqpz3BLc2rr6GeyC-FIyReAlNhVVdQ1NrR09ON2uAAo97jhuXt44AMoAVU8Iz+fwmASCM0QchkGzYUn4OHSmW46nYfEEEkKlgupVwlRq9UazXaXV6L3e3U+3x8OFc3W6PXBU2CoFmMmEMm0AkMOm4kg57DhcxkWlYOEMemiWnE6Ny52sZWsdzwhBIDzJOABrxa-XcrmZgWmIVm7Dkuzk5rkgl4OgOomFZsEOH45okcgS7FY3C06IVlyVlxV+CIJMevVeAIAQqM2n9fCF-CyoQg9BarTa7foHckEDEua7uJaZTJ0fwxf68ThlY1VaGaQmKJMjazQnMclxDO6ZDsOR6hbmUZp1BlsloJDI+NFK1ca1AcBAwAAjDAAVzo1RVdQAho0nIbISa1JwcN6CpjWCcJLokptiy63ekR+wxXIZ4GaLXFyv15vayGSCYWA0G3NAwBwbdyjArAAAoskEQQAEpiEVWwgy-Zc1w3YM1QPY02UQdReFPfgZFYdRJyLHtb0QPguWtKV9C0QRWBhE53zQz952-LC-3uUknm1XV9Tw1tZkMTQhAEeJ+FSc1eGFGEJAfbZpUMCTeA46t0PnWBtwANzuFD7DKcgCFA8psAAW20qs5xwPTDMaBAGn0jBqlAoIAG1BAAXVElNS2Iy8yIokQlJohB+A0JFjDkM0fSxcduC0+zHKMjVBJ1PUDUTZtDwIhAiJI0LcnC6jFP5HB5G2DkDBlSRUp0hyDIygTeiEnL-iBEEwTyiF8LbYxgtI8iyqo91HWi2LXWi7Myv4JquJapz+PDLVsv1OkGSZfrkyPIqZRKsbKIixTppqrFUUncIdCWwJa3IVclwIFBYCJNbNUjGM41+QFgVcUEAoO20JQ9URrRMUQtGMYVMlkFTZA4cGZFLe6VSel63o+sMvujWN422xlumBwqEqRDNbSvHYB02aLJMfY5otyBJ0eJCB6HA4DQPA1DbIeqBSbbVjeE7TElNRbIOGFW7qt4CcEOvbJuzZpoXj+Dw+m8IYAHFAaF2ZXWUn1WFyPQCl0XgFMHQU5YybhSMxX1sRxOgMEXeAQj5gCDehWFB0icUR0yFiX3kCRUpMrBIF9hA5H4OHmPFcR9lF61RB7LSCVuRpY8vBDqqxeRslFdR4rh4xlNdKVJF0cdy1VuswFjj1gvi81RrFXgczpm0JUxYRSOiViMkbnjfy3WpdxgCA8-IxFfSOZZOE4CRFMtU8iOvVHjEkN8cT5+zx+w-9cL2lsU29MQcHdBq4gd9F9HXzQxvl0jUfid0x8wifc-Pgq2wxHFFJWSl45J8GFDsYihYmJejEGbRu6U-5NgGmJRA5YwZX0hssGGCdcx8GUqKaSpEJwcFtOwRumNXrvTuLHHQxExCnB7EYMarAZbZB4ByViEtZJYkoc9ahtQY7-0GrMbYuxbSlkiGRH0o04aXi0DgdECFSICDiGaCOB8AycQFi3ZSGgsHHBwaWSKpZFEMQkHEK244ciuizg0bGrgdJ53iM6KRosFZaB9LaGWVU9D20kScU22JihVnKNuFARBZ4iLQQgfQEQoinBYqXf2mwEgsQlJePQadhCyE0aEmwsdRRwxigxGE5oOAFFYhQiwZggA */
  return createMachine(
    {
      context: {
        retries: 0,
        localDraft: null,
        prevDraft: null,
        errorMessage: '',
        publication: null,
        canPublish: false,
      },
      tsTypes: {} as import('./use-editor-draft.typegen').Typegen0,
      schema: { context: {} as EditorContext, events: {} as EditorEvent },
      id: 'editor',
      initial: 'idle',
      states: {
        idle: {
          always: {
            target: 'fetching',
          },
        },
        errored: {
          on: {
            FETCH: [
              {
                actions: 'displayFailedMessage',
                cond: 'maxRetriesReached',
                target: 'failed',
              },
              {
                actions: 'incrementRetries',
                target: 'fetching',
              },
            ],
          },
        },
        fetching: {
          invoke: {
            src: 'fetchDocument',
            id: 'fetchDocument',
          },
          on: {
            'EDITOR.CANCEL': {
              target: 'idle',
            },
            'EDITOR.REPORT.FETCH.SUCCESS': {
              actions: 'assignDraftsValue',
              target: 'editing',
            },
            'EDITOR.REPORT.FETCH.ERROR': {
              actions: 'assignError',
              target: 'errored',
            },
          },
        },
        editing: {
          entry: 'updateCurrentDocument',
          initial: 'idle',
          states: {
            idle: {
              on: {
                'EDITOR.UPDATE': {
                  actions: [
                    'validateCanPublish',
                    'updateValueToContext',
                    'updateCurrentDocument',
                  ],
                  target: 'debouncing',
                },
                'EDITOR.PUBLISH': {
                  target: 'publishing',
                },
                FETCH: {
                  target: '#editor.fetching',
                },
              },
            },
            debouncing: {
              initial: 'idle',
              states: {
                changed: {
                  always: {
                    target: 'idle',
                  },
                },
                idle: {
                  after: {
                    '1000': {
                      target: '#editor.editing.saving',
                    },
                  },
                },
              },
              on: {
                'EDITOR.UPDATE': {
                  actions: ['updateValueToContext', 'updateCurrentDocument'],
                  target: '.changed',
                },
              },
            },
            saving: {
              invoke: {
                src: 'saveDraft',
                onError: [
                  {
                    actions: 'assignError',
                    target: 'idle',
                  },
                ],
              },
              tags: 'saving',
              on: {
                'EDITOR.UPDATE': {
                  target: 'debouncing',
                },
                'EDITOR.UPDATE.SUCCESS': {
                  actions: ['updateLibrary', 'resetChanges'],
                  target: 'idle',
                },
                'EDITOR.UPDATE.ERROR': {
                  actions: 'assignError',
                  target: 'idle',
                },
              },
            },
            publishing: {
              invoke: {
                src: 'publishDraftService',
              },
              on: {
                'EDITOR.PUBLISH.SUCCESS': {
                  actions: 'assignPublication',
                  target: 'published',
                },
                'EDITOR.PUBLISH.ERROR': {
                  actions: 'assignError',
                  target: 'idle',
                },
              },
            },
            published: {
              type: 'final',
            },
          },
          on: {
            'RESET.CHANGES': {
              actions: 'resetChanges',
            },
          },
          onDone: {
            target: 'finishEditing',
          },
        },
        finishEditing: {
          entry: 'afterPublish',
          type: 'final',
        },
        failed: {
          type: 'final',
        },
      },
    },
    {
      guards: {
        maxRetriesReached: (context) => context.retries == 5,
      },
      actions: {
        validateCanPublish: assign((context) => {
          let hasContent = Editor.string(editor, [])
          let hasEmbed = Editor.nodes(editor, {
            at: [],
            match: isEmbed
          })

          console.log('validateCanPublish', { hasContent, hasEmbed });

          if (!context.canPublish) {
            return {
              canPublish: true
            }
          }

          return {}
        }),
        incrementRetries: assign({
          retries: (context) => context.retries + 1,
        }),
        assignDraftsValue: assign((_, event) => {
          // TODO: fixme types
          let newValue: EditorDocument = {
            ...event.data,
          }

          if (event.data.children?.length) {
            newValue.content = [blockNodeToSlate(event.data.children)]
          } else {
            newValue.content = defaultContent
            let entryNode = defaultContent[0].children[0]
            changesService.addChange(['moveBlock', entryNode.id])
            changesService.addChange(['replaceBlock', entryNode.id])
          }

          return {
            prevDraft: newValue,
            localDraft: newValue,
          }
        }),
        assignError: assign({
          errorMessage: (_, event) => JSON.stringify(event.errorMessage),
        }),
        updateValueToContext: assign({
          localDraft: (context, event) => {
            return {
              ...context.localDraft,
              ...event.payload,
              content: event.payload.content || context.localDraft?.content,
            }
          },
        }),
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        updateLibrary: () => {
          mainPageService.send('RECONCILE')
        },
      },
      services: {
        fetchDocument: (_, event) => (sendBack) => {
          ; (async () => {
            try {
              let { context } = mainPageService.getSnapshot()
              let data = await client.fetchQuery(
                [queryKeys.GET_DRAFT, context.params.docId],
                ({ queryKey }) => {
                  let [_, draftId] = queryKey
                  return getDraft(draftId)
                },
              )

              sendBack({ type: 'EDITOR.REPORT.FETCH.SUCCESS', data })
            } catch (err: any) {
              sendBack({
                type: 'EDITOR.REPORT.FETCH.ERROR',
                errorMessage: err.message,
              })
            }
          })()
        },
      },
    },
  )
}

export type UseEditorDraftParams = DraftEditorMachineProps & {
  documentId: string
  mainPageService: ReturnType<typeof useMainPage>
  options: MachineOptionsFrom<ReturnType<typeof draftEditorMachine>>
}

export function useEditorDraft({
  documentId,
  mainPageService,
  editor,
  shouldAutosave,
  options,
}: UseEditorDraftParams) {
  const client = useQueryClient()
  const [state, send] = useMachine(
    () => draftEditorMachine({ client, mainPageService, editor, shouldAutosave }),
    options,
  )

  useEffect(() => {
    if (documentId) {
      send({ type: 'FETCH', documentId })
      // onlyOnce.current = true
    }
  }, [documentId])
  return [state, send] as const
}
