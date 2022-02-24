import { Document, getDraft, Link, Publication, publishDraft, updateDraft } from '@app/client'
import { createUpdate } from '@app/client/v2/create-changes'
import { MINTTER_LINK_PREFIX } from '@app/constants'
import { changesService } from '@app/editor/mintter-changes/plugin'
import { queryKeys } from '@app/hooks'
import { useMainPage } from '@app/main-page-context'
import { createId, group, isEmbed, isFlowContent, isLink, paragraph, statement, text } from '@mintter/mttast'
import { useMachine } from '@xstate/react'
import isEqual from 'fast-deep-equal'
import { useEffect } from 'react'
import { QueryClient, useQueryClient } from 'react-query'
import { visit } from 'unist-util-visit'
import { assign, createMachine, MachineOptionsFrom } from 'xstate'
import { getEmbedIds } from './embed'

export type EditorDocument = Partial<Document> & {
  id?: string
  content: any
}

export type EditorContext = {
  retries: number;
  prevDraft: EditorDocument | null;
  localDraft: EditorDocument | null;
  errorMessage: string;
  publication: Publication | null
}
export type EditorEvent = { type: 'FETCH'; documentId: string } | {
  type: 'EDITOR.REPORT.FETCH.SUCCESS'; data: Document
} | { type: 'EDITOR.REPORT.FETCH.ERROR'; errorMessage: Error['message'] } |
{ type: 'EDITOR.UPDATE'; payload: Partial<EditorDocument> } |
{ type: 'EDITOR.UPDATE.SUCCESS' } |
{ type: 'EDITOR.UPDATE.ERROR'; errorMessage: Error['message'] } |
{ type: 'EDITOR.CANCEL' } |
{ type: 'EDITOR.PUBLISH' } |
{ type: 'EDITOR.PUBLISH.SUCCESS'; publication: Publication } |
{ type: 'EDITOR.PUBLISH.ERROR'; errorMessage: Error['message'] }

interface DraftEditorMachineProps {
  client: QueryClient;
  mainPageService: ReturnType<typeof useMainPage>
}

const defaultContent = [group({ data: { parent: "" } }, [statement({ id: createId() }, [paragraph([text('')])])])]


export const draftEditorMachine = ({ client, mainPageService }: DraftEditorMachineProps) =>
  createMachine(
    {
      tsTypes: {} as import("./use-editor-draft.typegen").Typegen0,
      schema: {
        context: {} as EditorContext,
        events: {} as EditorEvent
      },
      id: 'editor',
      initial: 'idle',
      context: {
        retries: 0,
        localDraft: null,
        prevDraft: null,
        errorMessage: '',
        publication: null
      },
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
                  'incrementRetries'
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
                    let data = await client.fetchQuery([queryKeys.GET_DRAFT, event.documentId], () =>
                      getDraft(event.documentId),
                    )
                    sendBack({ type: 'EDITOR.REPORT.FETCH.SUCCESS', data })
                  } catch (err: any) {
                    sendBack({ type: 'EDITOR.REPORT.FETCH.ERROR', errorMessage: err.message })
                  }
                })()
            },
          },
          on: {
            'EDITOR.CANCEL': {
              target: 'idle',
            },
            'EDITOR.REPORT.FETCH.SUCCESS': {
              target: 'editing',
              actions: [
                'assignDraftsValue'
              ],
            },
            'EDITOR.REPORT.FETCH.ERROR': {
              target: 'errored',
              actions: [
                'assignError'
              ],
            }
          },
        },
        editing: {
          id: 'editing',
          initial: 'idle',
          states: {
            idle: {
              on: {
                'EDITOR.UPDATE': {
                  actions: ['updateValueToContext'],
                  target: 'debouncing',
                },
                'EDITOR.PUBLISH': {
                  target: 'publishing',
                },
                FETCH: {
                  target: '#fetching',
                },
              },
            },
            debouncing: {
              on: {
                'EDITOR.UPDATE': {
                  actions: ['updateValueToContext'],
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
                      // await updateDraftV2(changes)

                      await updateDraft(newDraft as Document, links)
                      console.log('SAVED!!');

                      sendBack('EDITOR.UPDATE.SUCCESS')
                      changesService.send('reset')
                    } catch (err: any) {
                      sendBack({ type: 'EDITOR.UPDATE.ERROR', errorMessage: err.message })
                    }
                  })()
                },
                onError: {
                  target: 'idle',
                  actions: ['assignErrorToContext'],
                },
              },
              on: {
                'EDITOR.UPDATE.SUCCESS': {
                  target: 'idle',
                  actions: 'updateLibrary'
                },
                'EDITOR.UPDATE.ERROR': {
                  target: 'idle',
                  actions: [
                    'assignError'
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
                      sendBack('EDITOR.PUBLISH.SUCCESS')
                    })
                    .catch((err: any) => {
                      sendBack({ type: 'EDITOR.PUBLISH.ERROR', errorMessage: err.message })
                    })
                },
              },
              on: {
                'EDITOR.PUBLISH.SUCCESS': {
                  target: 'published',
                  actions: [
                    'assignPublication'
                  ],
                },
                'EDITOR.PUBLISH.ERROR': {
                  target: 'idle',
                  actions: [
                    'assignError'
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
        incrementRetries: assign({
          retries: (context) => context.retries++,
        }),
        assignDraftsValue: assign((_, event) => {
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
        }
        ),
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        updateLibrary: () => {
          mainPageService.send('RECONCILE')
        }
      },
    },
  )

export type UseEditorDraftParams = DraftEditorMachineProps & {
  documentId: string
  options: MachineOptionsFrom<ReturnType<typeof draftEditorMachine>>
  mainPageService: ReturnType<typeof useMainPage>
}

export function useEditorDraft({ documentId, mainPageService, options }: UseEditorDraftParams) {
  const client = useQueryClient()
  const [state, send] = useMachine(() => draftEditorMachine({ client, mainPageService }), options)

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
        let [documentId, version, blockId] = getEmbedIds(node.url)

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
