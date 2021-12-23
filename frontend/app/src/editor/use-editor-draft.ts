import {Document, getDraft, Link, Publication, publishDraft, updateDraft} from '@mintter/client'
import {FlowContent, isEmbed, isFlowContent, isLink, MttastContent} from '@mintter/mttast'
import {createId, group, paragraph, statement, text} from '@mintter/mttast-builder'
import {useActor, useInterpret} from '@xstate/react'
import isEqual from 'fast-deep-equal'
import {useEffect} from 'react'
import {QueryClient, useQueryClient} from 'react-query'
import {visit} from 'unist-util-visit'
import {createModel} from 'xstate/lib/model'
import {MINTTER_LINK_PREFIX} from '../constants'
import {queryKeys} from '../hooks'
import {getEmbedIds} from './embed'

export type EditorDocument = Partial<Document> & {
  content: Array<MttastContent> | Array<FlowContent>
}

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
      FETCH: (documentId: string) => ({documentId}),
      'REPORT.FETCH.RECEIVED': (data: Document) => ({data}),
      'REPORT.FETCH.ERROR': (errorMessage: string) => ({errorMessage}),
      UPDATE: (payload: EditorDocument) => ({payload}),
      CANCEL: () => ({}),
      PUBLISH: () => ({}),
      'REPORT.PUBLISH.SUCCESS': (publication: Publication) => ({publication}),
      'REPORT.PUBLISH.ERROR': (errorMessage: string) => ({errorMessage}),
      'REPORT.UPDATE.SUCCESS': () => ({}),
      'REPORT.UPDATE.ERROR': (errorMessage: string) => ({errorMessage}),
    },
  },
)

interface DraftEditorMachineProps {
  client: QueryClient
  afterPublish: any
  loadAnnotations: any
}

const defaultContent = [group([statement({id: createId()}, [paragraph([text('')])])])]

const updateValueToContext = editorModel.assign(
  {
    localDraft: (context, event) => {
      return {
        ...context.localDraft,
        ...event.payload,
      }
    },
  },
  'UPDATE',
)

export const draftEditorMachine = ({afterPublish, loadAnnotations, client}: DraftEditorMachineProps) =>
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
          on: {
            CANCEL: {
              target: 'idle',
            },
            'REPORT.FETCH.RECEIVED': {
              target: 'editing',
              actions: [
                editorModel.assign((_, event) => {
                  let newValue = {
                    ...event.data,
                    content: event.data.content ? JSON.parse(event.data.content) : defaultContent,
                  }
                  return {
                    prevDraft: newValue,
                    localDraft: newValue,
                  }
                }),
                'loadAnnotations',
              ],
            },
            'REPORT.FETCH.ERROR': {
              target: 'errored',
              actions: [
                editorModel.assign({
                  errorMessage: (_, event) => JSON.stringify(event.errorMessage),
                }),
              ],
            },
          },
          invoke: {
            src: (_, event) => (sendBack) => {
              if (event.type != 'FETCH') return
              ;(async () => {
                try {
                  let draft = await getDraft(event.documentId)
                  client.setQueryData([queryKeys.GET_DRAFT, event.documentId], draft)
                  sendBack(editorModel.events['REPORT.FETCH.RECEIVED'](draft))
                } catch (err: any) {
                  sendBack(editorModel.events['REPORT.FETCH.ERROR'](err))
                }
              })()
            },
          },
        },
        editing: {
          id: 'editing',
          initial: 'idle',
          states: {
            idle: {
              on: {
                UPDATE: {
                  actions: [updateValueToContext],
                  target: 'debouncing',
                },
                PUBLISH: {
                  target: 'publishing',
                },
                FETCH: {
                  target: '#fetching',
                },
              },
            },
            debouncing: {
              on: {
                UPDATE: {
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
                  ;(async () => {
                    let newDraft = {
                      ...context.localDraft,
                      content: JSON.stringify(context.localDraft?.content),
                    }
                    let links = buildLinks(context.localDraft!)

                    try {
                      await updateDraft(newDraft as Document, links)
                      sendBack(editorModel.events['REPORT.UPDATE.SUCCESS']())
                    } catch (err: any) {
                      sendBack(editorModel.events['REPORT.UPDATE.ERROR'](err))
                    }
                  })()
                },
                onError: {
                  target: 'idle',
                  actions: ['assignErrorToContext'],
                },
              },
              on: {
                'REPORT.UPDATE.SUCCESS': {
                  target: 'idle',
                },
                'REPORT.UPDATE.ERROR': {
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
                      sendBack(editorModel.events['REPORT.PUBLISH.SUCCESS'](publication))
                    })
                    .catch((err: any) => {
                      sendBack(editorModel.events['REPORT.PUBLISH.ERROR'](err))
                    })
                },
              },
              on: {
                'REPORT.PUBLISH.SUCCESS': {
                  target: 'published',
                  actions: [
                    editorModel.assign({
                      publication: (_, event) => event.publication,
                    }),
                  ],
                },
                'REPORT.PUBLISH.ERROR': {
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
        loadAnnotations,
      },
    },
  )

export type UseEditorDraftParams = DraftEditorMachineProps & {
  documentId: string
}

export function useEditorDraft({documentId, ...afterActions}: UseEditorDraftParams) {
  const client = useQueryClient()
  const service = useInterpret(draftEditorMachine({...afterActions, client}))

  const [state, send] = useActor(service)

  useEffect(() => {
    if (documentId) {
      send({type: 'FETCH', documentId})
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
