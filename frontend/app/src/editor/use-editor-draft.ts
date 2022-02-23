import { Document, getDraft, Link, Publication, publishDraft, updateDraftV2 } from '@app/client'
import { createUpdate } from '@app/client/v2/create-changes'
import { MINTTER_LINK_PREFIX } from '@app/constants'
import { changesService } from '@app/editor/mintter-changes/plugin'
import { queryKeys } from '@app/hooks'
import { createId, Embed, group, isEmbed, isFlowContent, isLink, paragraph, statement, text } from '@mintter/mttast'
import { useActor, useInterpret } from '@xstate/react'
import isEqual from 'fast-deep-equal'
import { useEffect } from 'react'
import { QueryClient, useQueryClient } from 'react-query'
import { visit } from 'unist-util-visit'
import { createModel } from 'xstate/lib/model'
import { getEmbedIds } from './embed'

export type EditorDocument = Partial<Document> & {
  id?: string
  content: any
}

export const EDITOR_REPORT_FETCH_SUCCESS = 'EDITOR.REPORT.FETCH.SUCCESS'
export const EDITOR_REPORT_FETCH_ERROR = 'EDITOR.REPORT.FETCH.ERROR'
export const EDITOR_UPDATE = 'EDITOR.UPDATE'
export const EDITOR_UPDATE_SUCCESS = 'EDITOR.UPDATE.SUCCESS'
export const EDITOR_UPDATE_ERROR = 'EDITOR.UPDATE.ERROR'
export const EDITOR_CANCEL = 'EDITOR.CANCEL'
export const EDITOR_PUBLISH = 'EDITOR.PUBLISH'
export const EDITOR_PUBLISH_SUCCESS = 'EDITOR.PUBLISH.SUCCESS'
export const EDITOR_PUBLISH_ERROR = 'EDITOR.PUBLISH.ERROR'

export const editorModel = createModel(
  {
    retries: 0,
    prevDraft: null as EditorDocument | null,
    localDraft: null as EditorDocument | null,
    errorMessage: '',
    publication: null as Publication | null,
  },
  {
    events: {
      FETCH: (documentId: string) => ({ documentId }),
      [EDITOR_REPORT_FETCH_SUCCESS]: (data: Document) => ({ data }),
      [EDITOR_REPORT_FETCH_ERROR]: (errorMessage: string) => ({ errorMessage }),
      [EDITOR_UPDATE]: (payload: EditorDocument) => ({ payload }),
      [EDITOR_CANCEL]: () => ({}),
      [EDITOR_PUBLISH]: () => ({}),
      [EDITOR_PUBLISH_SUCCESS]: (publication: Publication) => ({ publication }),
      [EDITOR_PUBLISH_ERROR]: (errorMessage: string) => ({ errorMessage }),
      [EDITOR_UPDATE_SUCCESS]: () => ({}),
      [EDITOR_UPDATE_ERROR]: (errorMessage: Error['message']) => ({ errorMessage }),
    },
  },
)

interface DraftEditorMachineProps {
  client: QueryClient
  afterPublish: any
}

const defaultContent = [group({ data: { parent: "" } }, [statement({ id: createId() }, [paragraph([text('')])])])]

const updateValueToContext = editorModel.assign(
  {
    localDraft: (context, event) => {
      return {
        ...context.localDraft,
        ...event.payload,
      }
    },
  },
  EDITOR_UPDATE,
)

export const draftEditorMachine = ({ afterPublish, client }: DraftEditorMachineProps) =>
  editorModel.createMachine(
    {
      id: 'editor',
      initial: 'idle',
      context: editorModel.initialContext,
      states: {
        idle: {
          on: {
            FETCH: {
              target: 'fetching',
            },
          },
        },
        errored: {
          on: {
            FETCH: [
              {
                target: 'failed',
                cond: (context) => context.retries == 5,
                actions: ['displayFailedMessage'],
              },
              {
                target: 'fetching',
                actions: [
                  editorModel.assign({
                    retries: (context) => context.retries++,
                  }),
                ],
              },
            ],
          },
        },
        fetching: {
          id: 'fetching',
          invoke: {
            src: (_, event) => (sendBack) => {
              if (event.type != 'FETCH') return
                ; (async () => {
                  try {
                    let draft = await client.fetchQuery([queryKeys.GET_DRAFT, event.documentId], () =>
                      getDraft(event.documentId),
                    )
                    console.log("🚀 ~ file: use-editor-draft.ts ~ line 116 ~ ; ~ draft", draft)
                    sendBack(editorModel.events[EDITOR_REPORT_FETCH_SUCCESS](draft))
                  } catch (err: any) {
                    sendBack(editorModel.events[EDITOR_REPORT_FETCH_ERROR](err.message))
                  }
                })()
            },
          },
          on: {
            [EDITOR_CANCEL]: {
              target: 'idle',
            },
            [EDITOR_REPORT_FETCH_SUCCESS]: {
              target: 'editing',
              actions: [
                editorModel.assign((_, event) => {
                  // TODO: make sure we add the default content in the changes array
                  let newValue = {
                    ...event.data,
                    content: event.data.content ? JSON.parse(event.data.content) : defaultContent,
                  }
                  return {
                    prevDraft: newValue,
                    localDraft: newValue,
                  }
                }),
              ],
            },
            [EDITOR_REPORT_FETCH_ERROR]: {
              target: 'errored',
              actions: [
                editorModel.assign({
                  errorMessage: (_, event) => JSON.stringify(event.errorMessage),
                }),
              ],
            },
          },
        },
        editing: {
          id: 'editing',
          initial: 'idle',
          states: {
            idle: {
              on: {
                [EDITOR_UPDATE]: {
                  actions: [updateValueToContext],
                  target: 'debouncing',
                },
                [EDITOR_PUBLISH]: {
                  target: 'publishing',
                },
                FETCH: {
                  target: '#fetching',
                },
              },
            },
            debouncing: {
              on: {
                [EDITOR_UPDATE]: {
                  actions: [updateValueToContext],
                },
              },
              after: {
                1000: [
                  {
                    target: 'saving',
                    cond: 'isValueDirty',
                  },
                  {
                    target: 'idle',
                  },
                ],
              },
            },
            saving: {
              invoke: {
                src: (context) => (sendBack) => {
                  ; (async () => {
                    let newDraft = {
                      ...context.localDraft,
                      content: JSON.stringify(context.localDraft?.content),
                    }

                    let changes = createUpdate(context.localDraft!)
                    console.log("🚀 ~ CHANGES: ", changes)

                    // let changes = await buildChanges()
                    let links = buildLinks(context.localDraft!)

                    try {
                      await updateDraftV2(changes)
                      // await updateDraft(newDraft as Document, links)
                      sendBack(editorModel.events[EDITOR_UPDATE_SUCCESS]())
                      changesService.send('reset')
                    } catch (err: any) {
                      sendBack(editorModel.events[EDITOR_UPDATE_ERROR](err.message))
                    }
                  })()
                },
                onError: {
                  target: 'idle',
                  actions: ['assignErrorToContext'],
                },
              },
              on: {
                [EDITOR_UPDATE_SUCCESS]: {
                  target: 'idle',
                },
                [EDITOR_UPDATE_ERROR]: {
                  target: 'idle',
                  actions: [
                    editorModel.assign({
                      errorMessage: (_, event) => JSON.stringify(event.errorMessage),
                    }),
                  ],
                },
              },
            },
            publishing: {
              invoke: {
                src: (context) => (sendBack) => {
                  if (!context.localDraft) return

                  publishDraft(context.localDraft.id!)
                    .then((publication) => {
                      sendBack(editorModel.events[EDITOR_PUBLISH_SUCCESS](publication))
                    })
                    .catch((err: any) => {
                      sendBack(editorModel.events[EDITOR_PUBLISH_ERROR](err))
                    })
                },
              },
              on: {
                [EDITOR_PUBLISH_SUCCESS]: {
                  target: 'published',
                  actions: [
                    editorModel.assign({
                      publication: (_, event) => event.publication,
                    }),
                  ],
                },
                [EDITOR_PUBLISH_ERROR]: {
                  target: 'idle',
                  actions: [
                    editorModel.assign({
                      errorMessage: (_, event) => JSON.stringify(event.errorMessage),
                    }),
                  ],
                },
              },
            },
            published: {
              type: 'final',
            },
          },
          onDone: {
            target: 'finishEditing',
          },
        },
        finishEditing: {
          entry: ['afterPublish'],
          type: 'final',
        },
        failed: {
          type: 'final',
        },
      },
    },
    {
      guards: {
        isValueDirty: (context) => {
          const isContentNotEqual = !isEqual(context.localDraft?.content, context.prevDraft?.content)
          const isTitleNotEqual = !isEqual(context.localDraft?.title, context.prevDraft?.title)
          const isSubtitleNotEqual = !isEqual(context.localDraft?.subtitle, context.prevDraft?.subtitle)
          return isContentNotEqual || isTitleNotEqual || isSubtitleNotEqual
        },
      },
      actions: {
        afterPublish,
      },
    },
  )

export type UseEditorDraftParams = DraftEditorMachineProps & {
  documentId: string
}

export function useEditorDraft({ documentId, ...afterActions }: UseEditorDraftParams) {
  const client = useQueryClient()
  const service = useInterpret(() => draftEditorMachine({ ...afterActions, client }))

  const [state, send] = useActor(service)

  useEffect(() => {
    if (documentId) {
      send({ type: 'FETCH', documentId })
    }
  }, [send, documentId])
  return [state, send] as const
}

function buildLinks(draft: EditorDocument): Array<Link> {
  let links: Array<Link> = []

  visit(draft.content[0], isFlowContent, (block) => {
    visit(
      block.children[0],
      (node) => (isEmbed(node) || isLink(node)) && node.url.includes(MINTTER_LINK_PREFIX),
      (node) => {
        let [documentId, version, blockId] = getEmbedIds((node as Embed | Link).url)

        links.push({
          target: {
            documentId,
            version,
            blockId,
          },
          source: {
            blockId: block.id,
            version: '',
            documentId: '',
          },
        })
      },
    )
  })

  return links
}
