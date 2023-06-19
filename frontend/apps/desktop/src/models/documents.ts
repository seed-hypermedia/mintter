import {
  draftsClient,
  getWebSiteClient,
  publicationsClient,
} from '@app/api-clients'
import {editorBlockToServerBlock} from '@app/client/editor-to-server'
import {hdBlockSchema} from '@app/client/schema'
import {serverChildrenToEditorChildren} from '@app/client/server-to-editor'
import {appInvalidateQueries, appQueryClient} from '@app/query-client'
import {toast} from '@app/toast'
import {insertImage} from '@app/types/image'
import {NavRoute} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Timestamp} from '@bufbuild/protobuf'
import {
  Document,
  DocumentChange,
  GroupingContent,
  Publication,
  WebPublicationRecord,
} from '@mintter/shared'
import {
  Block,
  BlockNoteEditor,
  InlineContent,
  PartialBlock,
} from '@app/blocknote-core'
import {defaultReactSlashMenuItems, useBlockNote} from '@app/blocknote-react'
import {
  FetchQueryOptions,
  QueryClient,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQueries,
  useQuery,
} from '@tanstack/react-query'
import {findParentNode} from '@tiptap/core'
import {useEffect, useMemo, useRef, useState} from 'react'
import {formattingToolbarFactory} from '../editor/formatting-toolbar'
import {queryKeys} from './query-keys'
import {extractReferencedDocs} from './sites'
import {
  isMintterGatewayLink,
  isMintterScheme,
  normalizeMintterLink,
} from '@app/utils/mintter-link'

export type HDBlock = Block<typeof hdBlockSchema>
export type HDPartialBlock = PartialBlock<typeof hdBlockSchema>

function createEmptyChanges(): DraftChangesState {
  return {
    changed: new Set<string>(),
    deleted: new Set<string>(),
    moves: [],
  }
}

export function usePublicationList() {
  return useQuery({
    queryKey: [queryKeys.GET_PUBLICATION_LIST],
    refetchOnMount: true,
    queryFn: async () => {
      const result = await publicationsClient.listPublications({})
      const publications =
        result.publications.sort((a, b) =>
          sortDocuments(a.document?.updateTime, b.document?.updateTime),
        ) || []
      return {
        ...result,
        publications,
      }
    },
  })
}

export function useDraftList() {
  return useQuery({
    queryKey: [queryKeys.GET_DRAFT_LIST],
    refetchOnMount: true,
    queryFn: async () => {
      const result = await draftsClient.listDrafts({
        pageSize: undefined,
        pageToken: undefined,
      })
      const documents =
        result.documents.sort((a, b) =>
          sortDocuments(a.updateTime, b.updateTime),
        ) || []
      return {
        ...result,
        documents,
      }
    },
  })
}

export function useDeleteDraft(
  opts: UseMutationOptions<void, unknown, string>,
) {
  return useMutation({
    ...opts,
    mutationFn: async (documentId) => {
      await draftsClient.deleteDraft({documentId})
    },
    onSuccess: (...args) => {
      appInvalidateQueries([queryKeys.GET_DRAFT_LIST])
      opts?.onSuccess?.(...args)
    },
  })
}

export function useDeletePublication(
  opts: UseMutationOptions<void, unknown, string>,
) {
  return useMutation({
    ...opts,
    mutationFn: async (documentId) => {
      await publicationsClient.deletePublication({documentId})
    },
    onSuccess: (...args) => {
      appInvalidateQueries([queryKeys.GET_PUBLICATION_LIST])
      opts?.onSuccess?.(...args)
    },
  })
}

export function useDraft({
  documentId,
  ...options
}: UseQueryOptions<EditorDraftState> & {
  documentId?: string
}) {
  return useQuery(getDraftQuery(documentId, options))
}

function queryPublication(
  documentId?: string,
  versionId?: string,
): UseQueryOptions<Publication> | FetchQueryOptions<Publication> {
  return {
    queryKey: [queryKeys.GET_PUBLICATION, documentId, versionId],
    enabled: !!documentId,
    queryFn: () =>
      publicationsClient.getPublication({
        documentId,
        version: versionId,
      }),
  }
}
export function usePublication({
  documentId,
  versionId,
  ...options
}: UseQueryOptions<Publication> & {
  documentId?: string
  versionId?: string
}) {
  return useQuery({
    ...queryPublication(documentId, versionId),
    ...options,
  })
}

export function prefetchPublication(documentId: string, versionId?: string) {
  appQueryClient.prefetchQuery(queryPublication(documentId, versionId))
}

export function fetchPublication(documentId: string, versionId?: string) {
  return appQueryClient.fetchQuery(queryPublication(documentId, versionId))
}

export function useDocumentVersions(
  documentId: string | undefined,
  versions: string[],
) {
  return useQueries({
    queries: versions.map((version) => queryPublication(documentId, version)),
  })
}

export function prefetchDraft(client: QueryClient, draft: Document) {
  client.prefetchQuery({
    queryKey: [queryKeys.GET_DRAFT, draft.id],
    queryFn: () => draftsClient.getDraft({documentId: draft.id}),
  })
}

function sortDocuments(a?: Timestamp, b?: Timestamp) {
  let dateA = a ? a.toDate() : 0
  let dateB = b ? b.toDate() : 1

  // @ts-ignore
  return dateB - dateA
}

export function usePublishDraft(
  opts?: UseMutationOptions<
    Publication,
    unknown,
    {
      draftId: string
      webPub: WebPublicationRecord | undefined
    }
  >,
) {
  return useMutation({
    ...opts,
    mutationFn: async ({
      webPub,
      draftId,
    }: {
      draftId: string
      webPub: WebPublicationRecord | undefined
    }) => {
      console.log('Hello usePublishDraft', {webPub, draftId})

      const pub = await draftsClient.publishDraft({documentId: draftId})
      const doc = pub.document
      if (webPub && doc && webPub.hostname === pub.document?.webUrl) {
        const site = getWebSiteClient(webPub.hostname)
        const referencedDocuments = extractReferencedDocs(doc)
        await site
          .publishDocument({
            documentId: doc.id,
            path: webPub.path,
            version: pub.version,
            referencedDocuments,
          })
          .catch((e) => {
            toast.error(
              `Failed to publish document to ${hostnameStripProtocol(
                webPub.hostname,
              )}`,
            )
            console.error('Failed to publish document', {webPub, pub})
            console.error(e)
          })
      }
      return pub
    },
    onSuccess: (pub: Publication, variables, context) => {
      appInvalidateQueries([queryKeys.GET_PUBLICATION_LIST])
      appInvalidateQueries([queryKeys.PUBLICATION_CITATIONS])
      appInvalidateQueries([queryKeys.GET_DRAFT_LIST])
      appInvalidateQueries([queryKeys.GET_PUBLICATION, pub.document?.id])
      appInvalidateQueries([queryKeys.PUBLICATION_CHANGES, pub.document?.id])
      appInvalidateQueries([queryKeys.PUBLICATION_CITATIONS])
      appInvalidateQueries([queryKeys.GET_SITE_PUBLICATIONS])
      opts?.onSuccess?.(pub, variables, context)

      setTimeout(() => {
        // do this later to wait for the draft component to unmount
        appInvalidateQueries([queryKeys.GET_DRAFT, pub.document?.id])
        appQueryClient.removeQueries([queryKeys.EDITOR_DRAFT, pub.document?.id])
        // otherwise it will re-query for a draft that no longer exists and an error happens
      }, 250)
    },
  })
}

export type EditorDraftState = {
  id: string
  children: PartialBlock<typeof hdBlockSchema>[]
  title: string
  changes: DraftChangesState
  webUrl: string
}

export function useDraftTitle(
  input: UseQueryOptions<EditorDraftState> & {documentId: string},
) {
  let data = useCacheListener<EditorDraftState>([
    queryKeys.EDITOR_DRAFT,
    input.documentId,
  ])
  // let {data} = useEditorDraft({documentId: input.documentId})
  return useMemo(() => getDocumentTitle(data), [data])
}

function getTitleFromInline(children: InlineContent[]): string {
  const topChild = children[0]
  if (!topChild) return ''
  return children
    .map((inline) => {
      if (inline.type === 'link') {
        return getTitleFromInline(inline.content)
      }
      return inline.text
    })
    .join('')
}

export function getTitleFromContent(children: HDBlock[]): string {
  const topChild = children[0]
  if (!topChild) return ''
  return getTitleFromInline(topChild.content)
}

export function getDocumentTitle(doc?: EditorDraftState) {
  let titleText = doc?.title || ''
  return titleText
    ? titleText.length < 50
      ? titleText
      : `${titleText.substring(0, 49)}...`
    : 'Untitled Document'
}

type DraftChangesState = {
  moves: MoveBlockAction[]
  changed: Set<string>
  deleted: Set<string>
  webUrl?: string
}

type MoveBlockAction = {
  blockId: string
  leftSibling: string
  parent: string
}

type ChangeBlockAction = {
  type: 'changeBlock'
  blockId: string
}

type DeleteBlockAction = {
  type: 'deleteBlock'
  blockId: string
}

type DraftChangeAction = MoveBlockAction | ChangeBlockAction | DeleteBlockAction

// function draftChangesReducer(
//   state: DraftChangesState,
//   action: DraftChangeAction,
// ): DraftChangesState {
//   if (action.type === 'moveBlock') {
//     return {
//       ...state,
//       moves: [...state.moves, action],
//     }
//   } else if (action.type === 'deleteBlock') {
//     return {
//       ...state,
//       deleted: [...state.deleted, action.blockId],
//       changed: state.changed.filter((blockId) => blockId !== action.blockId),
//       moves: state.moves.filter((move) => move.blockId !== action.blockId),
//     }
//   } else if (action.type === 'changeBlock') {
//     if (state.changed.indexOf(action.blockId) === -1) {
//       return {
//         ...state,
//         changed: [...state.changed, action.blockId],
//       }
//     }
//   }
//   return state
// }

function getDraftQuery(
  documentId: string | undefined,
  opts?: UseQueryOptions<EditorDraftState>,
) {
  const {enabled = true, ...restOpts} = opts || {}
  return {
    queryKey: [queryKeys.EDITOR_DRAFT, documentId],
    queryFn: async () => {
      const serverDraft = await draftsClient.getDraft({
        documentId,
      })
      let debugExampleDoc = null
      // debugExampleDoc = examples.twoParagraphs // comment me out before committing, thankyouu
      const topChildren = serverChildrenToEditorChildren(
        (debugExampleDoc || serverDraft).children,
      )
      const draftState: EditorDraftState = {
        children: topChildren,
        changes: {
          changed: new Set<string>(),
          deleted: new Set<string>(),
          moves: [],
        },
        webUrl: serverDraft.webUrl,
        title: serverDraft.title,
        id: serverDraft.id,
      }
      return draftState
    },
    enabled: !!documentId && enabled,
    ...restOpts,
  }
}

export function useDraftEditor(
  documentId?: string,
  opts?: {onEditorState?: (v: any) => void},
) {
  let savingDebounceTimout = useRef<any>(null)

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!editor) return
      const draftState: EditorDraftState | undefined =
        appQueryClient.getQueryData([queryKeys.EDITOR_DRAFT, documentId])
      if (!draftState) return

      const {changed, moves, deleted} = draftState.changes
      const newTitle = getTitleFromContent(editor.topLevelBlocks)
      const changes: Array<DocumentChange> = [
        new DocumentChange({
          op: {
            case: 'setTitle',
            value: newTitle,
          },
        }),
      ]

      deleted.forEach((blockId) => {
        changes.push(
          new DocumentChange({
            op: {
              case: 'deleteBlock',
              value: blockId,
            },
          }),
        )
      })

      moves.forEach((move) => {
        changes.push(
          new DocumentChange({
            op: {
              case: 'moveBlock',
              value: {
                blockId: move.blockId,
                leftSibling: move.leftSibling,
                parent: move.parent,
              },
            },
          }),
        )
      })

      changed.forEach((blockId) => {
        const currentBlock = editor.getBlock(blockId)
        if (!currentBlock) return
        const serverBlock = editorBlockToServerBlock(currentBlock)
        changes.push(
          new DocumentChange({
            op: {
              case: 'replaceBlock',
              value: serverBlock,
            },
          }),
        )
      })
      await draftsClient.updateDraft({
        documentId,
        changes,
      })

      appQueryClient.setQueryData(
        [queryKeys.EDITOR_DRAFT, documentId],
        (state: EditorDraftState | undefined) => {
          if (!state) return undefined
          return {
            ...state,
            changes: createEmptyChanges(),
          }
        },
      )
    },
  })

  let lastBlocks = useRef<Record<string, HDBlock>>({})
  let lastBlockParent = useRef<Record<string, string>>({})
  let lastBlockLeftSibling = useRef<Record<string, string>>({})

  function prepareBlockObservations(
    blocks: Block<typeof hdBlockSchema>[],
    parentId: string,
  ) {
    blocks.forEach((block, index) => {
      const leftSibling = index === 0 ? '' : blocks[index - 1]?.id
      lastBlockParent.current[block.id] = parentId
      lastBlockLeftSibling.current[block.id] = leftSibling
      lastBlocks.current[block.id] = block
      if (block.children) {
        prepareBlockObservations(block.children, block.id)
      }
    })
  }

  function handleMaybeReady() {
    const [editor, draft] = readyThings.current
    if (!editor || !draft) return
    // we load the data from the backend here
    editor.replaceBlocks(editor.topLevelBlocks, [
      ...draft.children,
      // editor._tiptapEditor.schema.nodes.paragraph.create(),
    ])

    // this is to populate the blocks we use to compare changes
    prepareBlockObservations(editor.topLevelBlocks, '')
  }

  const editor = useBlockNote<typeof hdBlockSchema>({
    onEditorContentChange(editor: BlockNoteEditor<typeof hdBlockSchema>) {
      opts?.onEditorState?.(editor.topLevelBlocks)
      if (!readyThings.current[0] || !readyThings.current[1]) return

      let changedBlockIds = new Set<string>()
      let possiblyRemovedBlockIds = new Set<string>(
        Object.keys(lastBlocks.current),
      )
      const nextBlocks: Record<string, HDBlock> = {}
      const moves: MoveBlockAction[] = []
      function observeBlocks(
        blocks: Block<typeof hdBlockSchema>[],
        parentId: string,
      ) {
        blocks.forEach((block, index) => {
          let embedRef = extractEmbedRefOfLink(block)
          if (embedRef) {
            editor.updateBlock(block, {
              type: 'embedBlock',
              content: [
                {
                  type: 'text',
                  text: ' ',
                  styles: {},
                },
              ],
              props: {
                ref: embedRef,
              },
            })
          }
          possiblyRemovedBlockIds.delete(block.id)
          const leftSibling = index === 0 ? '' : blocks[index - 1]?.id
          if (
            lastBlockParent.current[block.id] !== parentId ||
            lastBlockLeftSibling.current[block.id] !== leftSibling
          ) {
            moves.push({
              blockId: block.id,
              leftSibling,
              parent: parentId,
            })
          }
          if (lastBlocks.current[block.id] !== block) {
            changedBlockIds.add(block.id)
          }
          nextBlocks[block.id] = block
          lastBlockParent.current[block.id] = parentId
          lastBlockLeftSibling.current[block.id] = leftSibling
          if (block.children) {
            observeBlocks(block.children, block.id)
          }
        })
      }
      observeBlocks(editor.topLevelBlocks, '')
      const removedBlockIds = possiblyRemovedBlockIds
      lastBlocks.current = nextBlocks

      clearTimeout(savingDebounceTimout.current)
      savingDebounceTimout.current = setTimeout(() => {
        saveDraftMutation.mutate()
      }, 500)

      appQueryClient.setQueryData(
        [queryKeys.EDITOR_DRAFT, documentId],
        (state: EditorDraftState | undefined) => {
          if (!state) {
            console.warn('no editor state yet!')
            return
          }
          console.log('applying draft changes', {
            changed: [...state.changes.changed].map(
              (change) => lastBlocks.current[change],
            ),
            moves: state.changes.moves,
            deleted: [...state.changes.deleted],
          })
          changedBlockIds.forEach((blockId) =>
            state.changes.changed.add(blockId),
          )
          moves.forEach((move) => state.changes.moves.push(move))
          removedBlockIds.forEach((blockId) =>
            state.changes.deleted.add(blockId),
          )
          return {
            ...state,
            title: getTitleFromContent(editor.topLevelBlocks),
            changes: state.changes,
          }
        },
      )
    },
    onEditorReady: (e) => {
      readyThings.current[0] = e
      handleMaybeReady()
    },
    uiFactories: {
      formattingToolbarFactory,
    },
    _tiptapOptions: {},
    blockSchema: hdBlockSchema,
    // @ts-expect-error
    slashCommands: [...defaultReactSlashMenuItems, insertImage],
  })

  const draft = useQuery(
    getDraftQuery(documentId, {
      enabled: !!editor,
      onSuccess: (draft: EditorDraftState) => {
        readyThings.current[1] = draft
        handleMaybeReady()
      },
    }),
  )

  // both the publication data and the editor are asyncronously loaded
  // using a ref to avoid extra renders, and ensure the editor is available and ready
  const readyThings = useRef<[HyperDocsEditor | null, EditorDraftState | null]>(
    [null, draft.data || null],
  )

  return {
    editor,
  }
}

export type HyperDocsEditor = Exclude<
  ReturnType<typeof useDraftEditor>['editor'],
  null
>

export function useWriteDraftWebUrl(draftId?: string) {
  return useMutation({
    onMutate: (webUrl: string) => {
      let title: string

      appQueryClient.setQueryData(
        [queryKeys.EDITOR_DRAFT, draftId],
        (draft: EditorDraftState | undefined) => {
          if (!draft) return undefined
          return {
            ...draft,
            webUrl,
          }
        },
      )
    },
    mutationFn: async (webUrl: string) => {
      const draftData: EditorDraftState | undefined =
        appQueryClient.getQueryData([queryKeys.EDITOR_DRAFT, draftId])
      if (!draftData) {
        throw new Error(
          'failed to access editor from useWriteDraftWebUrl mutation',
        )
      }
      await draftsClient.updateDraft({
        documentId: draftId,
        // changes: draftData.changes,
        changes: [
          new DocumentChange({
            op: {
              case: 'setWebUrl',
              value: webUrl,
            },
          }),
        ],
      })

      appInvalidateQueries([queryKeys.GET_DRAFT_LIST])
      return null
    },
    onSuccess: (response, webUrl) => {
      appQueryClient.setQueryData(
        [queryKeys.EDITOR_DRAFT, draftId],
        (draft: EditorDraftState | undefined) => {
          if (!draft) return draft
          return {...draft, webUrl}
        },
      )
    },
  })
}

function useCacheListener<T = unknown>(queryKey: string[]) {
  const [data, setData] = useState<T | undefined>(undefined)

  useEffect(() => {
    let unsubscribe = appQueryClient.getQueryCache().subscribe((event) => {
      if (
        event.type == 'updated' &&
        event.action.type == 'success' &&
        compareArrays(queryKey, event.query.queryKey)
      ) {
        setData(event.action.data)
      }
    })

    return () => {
      unsubscribe?.()
    }
  }, [queryKey])

  return data
}

function compareArrays(arr1: any[], arr2: any[]): boolean {
  if (arr1.length !== arr2.length) {
    return false
  }

  return arr1.every((value, index) => value === arr2[index])
}

export const findBlock = findParentNode(
  (node) => node.type.name === 'blockContainer',
)

function applyPubToEditor(editor: HyperDocsEditor, pub: Publication) {
  // console.log('= applyPubToEditor')
  editor.isEditable = false // this is the way
  const editorBlocks = serverChildrenToEditorChildren(
    pub.document?.children || [],
  )
  editor.replaceBlocks(editor.topLevelBlocks, editorBlocks)
}

export function usePublicationEditor(documentId: string, versionId?: string) {
  const pub = usePublication({
    documentId,
    versionId,
    onSuccess: (pub: Publication) => {
      // console.log('= pub loaded')
      readyThings.current[1] = pub
      const readyEditor = readyThings.current[0]
      if (readyEditor) {
        applyPubToEditor(readyEditor, pub)
      }
    },
  })

  // both the publication data and the editor are asyncronously loaded
  // using a ref to avoid extra renders, and ensure the editor is available and ready
  const readyThings = useRef<[HyperDocsEditor | null, Publication | null]>([
    null,
    pub.data || null,
  ])

  // careful using this editor too quickly. even when it it appears, it may not be "ready" yet, and bad things happen if you replaceBlocks too early
  const editor: HyperDocsEditor | null = useBlockNote<typeof hdBlockSchema>({
    editable: false,
    // _tiptapOptions: {
    //   editable: false, // for some reason this doesn't work, but it works to set `editor.isEditable = false` after it is created
    // },
    blockSchema: hdBlockSchema,
    onEditorReady: (e) => {
      // console.log('= EDITOR READY', e)
      readyThings.current[0] = e
      const readyPub = readyThings.current[1]
      if (readyPub) {
        applyPubToEditor(e, readyPub)
      }
    },
  })

  return {
    ...pub,
    editor,
    isLoading: pub.isLoading || editor === null,
  }
}

function extractEmbedRefOfLink(block: any): false | string {
  if (block.content.length == 1) {
    let leaf = block.content[0]

    if (leaf.type == 'link') {
      if (isMintterGatewayLink(leaf.href) || isMintterScheme(leaf.href)) {
        const hdLink = normalizeMintterLink(leaf.href)
        if (hdLink) return hdLink
      }
    }
  }
  return false
}
