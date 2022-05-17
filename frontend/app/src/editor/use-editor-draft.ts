import { Document, getDraft, Publication } from '@app/client'
import { blockNodeToSlate } from '@app/client/v2/block-to-slate'
import { changesService } from '@app/editor/mintter-changes/plugin'
import { queryKeys } from '@app/hooks'
import { useMainPage } from '@app/main-page-context'
import { createId, group, paragraph, statement, text } from '@mintter/mttast'
import { useMachine } from '@xstate/react'
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
  publication: Publication | null
  shouldMigrate: boolean
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
  } | {
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
    statement({ id: createId() }, [
      paragraph([
        text(''),
      ])
    ]),
  ]),
]

export function draftEditorMachine({
  client,
  mainPageService,
  shouldAutosave = true,
  editor,
}: DraftEditorMachineProps) {

  /** @xstate-layout N4IgpgJg5mDOIC5SQJYBcD2AnAdCiANmAMSKgAOGs6KGAdmSAB6ICMAHAGw6sCcA7AAYATKwAs7MQGZ+AVgA0IAJ6JhU1jna9ZvduPazWssa2EBfM4tSZcYLFmyRiAMQCiAFQDCACUaVqaLQMSMyIYvzcvLxiwoKcAmr8wryKKgisUuzsOGLSvKacrKyCxbIWVhDo2DgAZmBoAMYAFih0UMSuACIAku4A8gBKOJ4AggBynq4AMn5UNPSMLOn8UrI8GVKCcUn8vGqpqrua2roGnHqCAuXglTa19c2t7V29gzgDrgAKg+44bl7eHAAZQAqp5JkCgbMAkFFohZMIDgheNxBGJ4gJBEJ1MIypYblVcHVGi02h0ev0hh9vgNfv8fDhXAMBoNofNgqAlgikeJzjholJ8oUERJ2FJrtZqtYnnhCCQXpScCDPp0Ru5XGzAgsQkt+OF+dotFIZLphPxWEjztkBQkZFJcmKJbcpbcZfgiOTXkNPiCAEJTbpA3whfzsuEIPX8A2yI0m9hmi3KRBaDQ2s2cTjCZJFJ2EnDStqyj304MUOZajmhZZiNZFY1bTg7PZSHklDS5QU4wQyc68XN3AtQHAQMAAIwwAFc6A0np7FcrVerNbCdYgUbweFJOLJu-xzWpTEiHZpcXxClnhLlWPx+y6aIWR+OpzOyUxYGgAIZoMA4D81b9YAAFEYWwAJTEJKtiug+Y6TtOTzLtqnLJmoOCGPo8Z7sI24pEmCC5BuNrbskaJ7Bmt5QfeQ6wB+ABus52A4uDkAQX41NgAC2+bOpRgSFjR9FtAgrS0RgDRfkEADaggALqIZWSyrFImjiIYJicCUsiZgoeHxsIPAxmiKYRKIFHcVROACbOCpvAuaoaiG5YrshCBKSpNbiKwGlGNpSJaRuHYolk6iYpwZmDpZdHWRStkqvZwJghCUKOTCSFVm5egeepmm+XhQjcEY7BYuI0TGOY+KQeZfHUVFZI2UMdnqoyzKsilYarq5sjKZlaleTluKWteOR5HI+RiGRrDhdBQ7kBOo4ECgsCks8MXen6AZBgl4KuJC8nhqYKw4FiEgxth9ocPwSLxmIBqCuEJkiKZFU8VVMqzfNi3LXObw+v6gaAkyLIDHtHWRtGsa7JhiZpEVN02uNuzEXqU1UcQED0D+75fj+lWDiDLnXjW6z1tsZrNq2OjDZ28ZcEkNYo9VxAfECHjDN44wAOI7fjVY0zkXD2pcqwcHsrZ7FTvD2nqIqNhY+J0BgI7wCElXumAPNcoieFqDdaLxFwWwhbk4X2I4EAa4gUiXjg2IZN2piiI2PLhIRsRiHEsg7qIYhmcSjxtBb6RCponBW1wO5Woe2tYjbo1aLwly5Mbz15hFauBzoymQ+w5paMYCLQ4gKwaKHNaFI2ly4uKKcDtNw6wc+CFtRW4a6MpuJyJ7Zq4oI7B+fEJ6GCs+dW1bDMylZAfN85VYCEeEg4J2mJcJw4SyDeNd3tVODvQtS1N2WqUKWueqbtuu77jiV0x5Id1k5IfAbxUqd17vn2QIHRgcDwcSXAYl6rAkFdVY-IhDSD0DoSM7Bx5T0Pu1FyKwkRWxukvPQktViSzkL7Von1XDTU-sHAWwhw5xCyFHNIxQsw20ltEXY6hzS7F9h+FARBzbTzSrqLcBoYhZnRKHTIWsKEu35G7D2XtxAUUDsQpEqE9ZRASKvWIYowpyyAA */
  return createMachine(
    {
      context: {
        retries: 0,
        localDraft: null,
        prevDraft: null,
        errorMessage: '',
        publication: null,
        shouldMigrate: false,
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
                  actions: ['updateValueToContext', 'updateCurrentDocument'],
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
                  always: 'idle'
                },
                idle: {
                  after: {
                    '1000': {
                      target: '#editor.editing.saving',
                    },
                  },
                }
              },
              on: {
                'EDITOR.UPDATE': {
                  actions: ['updateValueToContext', 'updateCurrentDocument'],
                  target: '.changed'
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
        // isValueDirty: (context) => {
        //   let isValueDirty = isEqual(context.localDraft?.content, context.prevDraft?.content)
        //   console.log("🚀 ~ file: use-editor-draft.ts ~ line 215 ~ isValueDirty", isValueDirty, { new: context.localDraft?.content, prev: context.prevDraft?.content })

        //   return isValueDirty
        // },
        maxRetriesReached: (context) => context.retries == 5,
      },
      actions: {
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

              console.log('fetch data: ', data);


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

  return [state, send] as const
}