import {
  draftsClient,
  getWebSiteClient,
  publicationsClient,
} from '@app/api-clients'
import {appInvalidateQueries, appQueryClient} from '@app/query-client'
import {toast} from '@app/toast'
import { ImageBlock, insertImage } from '@app/types/image'
import {NavRoute} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Timestamp} from '@bufbuild/protobuf'
import {
  Document,
  DocumentChange,
  GroupingContent,
  Publication,
  WebPublicationRecord,
  group,
  hdBlockSchema,
  paragraph,
  serverChildrenToEditorChildren,
  editorBlockToServerBlock,
  statement,
  text,
} from '@mintter/shared'
import {BlockNoteEditor, PartialBlock} from '@mtt-blocknote/core'
import {defaultReactSlashMenuItems, useBlockNote} from '@mtt-blocknote/react'
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
import {examples} from '../../../../packages/shared/src/client/editor/example-docs'
import {formattingToolbarFactory} from '../editor/formatting-toolbar'
import {queryKeys} from './query-keys'
import {extractReferencedDocs} from './sites'

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
  routeKey,
  ...options
}: UseQueryOptions<Document> & {
  documentId?: string
  routeKey: NavRoute['key']
}) {
  return useQuery({
    queryKey: [queryKeys.GET_DRAFT, documentId],
    enabled: routeKey == 'draft' && !!documentId,
    queryFn: () => {
      return draftsClient.getDraft({documentId: documentId})
    },
    ...options,
  })
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
        // otherwise it will re-query for a draft that no longer exists and an error happens
      }, 250)
    },
  })
}

let emptyEditorValue = group({data: {parent: ''}}, [
  statement([paragraph([text('')])]),
])

type DraftState = {
  children: PartialBlock<typeof hdBlockSchema>[]
  changes: DraftChangesState
  webUrl: string
}

function createEmptyChanges(): DraftChangesState {
  return {
    changed: new Set<string>(),
    deleted: new Set<string>(),
    moves: [],
  }
}

export function useDraftTitle(
  input: UseQueryOptions<DraftState> & {documentId: string},
) {
  let data = useCacheListener<DraftState>([
    queryKeys.EDITOR_DRAFT,
    input.documentId,
  ])
  // let {data} = useEditorDraft({documentId: input.documentId})
  return useMemo(() => getDocumentTitle(data), [data])
}

export function getTitleFromContent(children: Array<GroupingContent>): string {
  // @ts-ignore
  return SlateNode.string(SlateNode.get({children}, [0, 0, 0])) || ''
}

export function getDocumentTitle(doc?: DraftState) {
  // let titleText = doc?.children.length ? getTitleFromContent(doc?.children) : ''
  let titleText = 'todo'

  return titleText
    ? titleText.length < 50
      ? titleText
      : `${titleText.substring(0, 49)}...`
    : 'Untitled Document'
}

export type SaveDraftInput = {
  content: GroupingContent[]
}

type DraftChangesState = {
  moves: MoveBlockAction[]
  changed: Set<string>
  deleted: Set<string>
}

type MoveBlockAction = {
  blockId: string
  leftSibling: string
  parent: string
}

export function useDraftEditor(
  documentId?: string,
  opts?: {onEditorState?: (v: any) => void},
) {
  let savingDebounceTimout = useRef<any>(null)

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!editor) return
      const draftState: DraftState | undefined = appQueryClient.getQueryData([
        queryKeys.EDITOR_DRAFT,
        documentId,
      ])
      console.log('= mutationFn', draftState)
      if (!draftState) return
      const {changed, moves, deleted} = draftState.changes
      console.log('= saveDraftMutation', draftState.changes)
      const changes: Array<DocumentChange> = [
        new DocumentChange({
          op: {
            case: 'setTitle',
            value: 'LOL is this your title?',
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
        (state: DraftState | undefined) => {
          if (!state) return undefined
          return {
            ...state,
            changes: createEmptyChanges(),
          }
        },
      )
    },
  })

  let lastBlocks = useRef<Record<string, any>>({})

  const editor = useBlockNote<typeof hdBlockSchema>({
    onEditorContentChange(editor: BlockNoteEditor<typeof hdBlockSchema>) {
      opts?.onEditorState?.(editor.topLevelBlocks)
      // mutate editor here
      // console.log('UPDATED', JSON.stringify(editor.topLevelBlocks))

      let changedBlockIds = new Set<string>()
      editor.forEachBlock((newBlock) => {
        if (lastBlocks.current[newBlock.id] !== newBlock) {
          console.log('= detected change of block id ' + newBlock.id)
          changedBlockIds.add(newBlock.id)
          console.log('🚀 ~ == changedBlockIds:', changedBlockIds)
        }
        lastBlocks.current[newBlock.id] = newBlock
        return true
      })

      clearTimeout(savingDebounceTimout.current)
      savingDebounceTimout.current = setTimeout(() => {
        saveDraftMutation.mutate()
      }, 500)

      appQueryClient.setQueryData(
        [queryKeys.EDITOR_DRAFT, documentId],
        (state: DraftState | undefined) => {
          if (!state) {
            console.warn('no draft state found for tracking block id changes')
            return undefined
          }
          changedBlockIds.forEach((blockId) =>
            state.changes.changed.add(blockId),
          )
          return {
            ...state,
            changes: state.changes,
          }
        },
      )
    },
    uiFactories: {
      formattingToolbarFactory,
    },
    blockSchema: {
      ...hdBlockSchema,
      image: ImageBlock,
    },
    slashCommands: [...defaultReactSlashMenuItems, insertImage],
    _tiptapOptions: {
      // onf
    },
  })

  const draftState = useQuery({
    enabled: !!editor,
    queryKey: [queryKeys.EDITOR_DRAFT, documentId],
    queryFn: async () => {
      const serverDraft = await draftsClient.getDraft({
        documentId,
      })
      let debugExampleDoc = null
      // debugExampleDoc = examples.withOverlappingAnnotations // comment me out before committing, thankyouu
      const topChildren = serverChildrenToEditorChildren(
        (debugExampleDoc || serverDraft).children,
      )
      const draftState: DraftState = {
        children: topChildren,
        changes: createEmptyChanges(),
        webUrl: serverDraft.webUrl,
      }
      // convert data to editor blocks
      // return {} as DraftState
      return draftState
    },
    onSuccess: (draft: DraftState) => {
      if (draft.children.length && editor?._tiptapEditor) {
        // we load the data from the backend here
        editor.replaceBlocks(editor.topLevelBlocks, draft.children)

        // this is to populate the blocks we use to compare changes
        editor.forEachBlock((block) => {
          lastBlocks.current[block.id] = block
          return true
        })
      }
    },
  })

  return {
    editor,
  }
}

export type HyperDocsEditor = ReturnType<typeof useDraftEditor>['editor']

export function useWriteDraftWebUrl(draftId?: string) {
  return useMutation({
    onMutate: (webUrl: string) => {
      let title: string

      appQueryClient.setQueryData(
        [queryKeys.GET_DRAFT, draftId],
        (draft: Document | undefined) => {
          if (!draft) return undefined
          return new Document({
            ...draft,
            webUrl,
          })
        },
      )
    },
    mutationFn: async (webUrl: string) => {
      const draftData: DraftState | undefined = appQueryClient.getQueryData([
        queryKeys.EDITOR_DRAFT,
        draftId,
      ])
      if (!draftData) {
        throw new Error(
          'failed to access editor from useWriteDraftWebUrl mutation',
        )
      }
      await draftsClient.updateDraft({
        documentId: draftId,
        // changes: draftData.changes,
        changes: [],
      })

      appInvalidateQueries([draftId])
      appInvalidateQueries([queryKeys.GET_DRAFT_LIST])
      return null
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

export function usePublicationEditor(documentId: string, versionId?: string) {
  const pub = usePublication({
    documentId,
    versionId,
  })
  const editor: HyperDocsEditor = useBlockNote<typeof hdBlockSchema>({
    // _tiptapOptions: {
    //   editable: false, // for some reason this doesn't work, but it works to set `editor.isEditable = false` after it is created
    // },
    blockSchema: hdBlockSchema,
  })
  useEffect(() => {
    if (pub.data?.document && editor) {
      editor.isEditable = false // this is the way
      editor.replaceBlocks(
        editor.topLevelBlocks,
        serverChildrenToEditorChildren(pub.data.document?.children || []),
      )
    }
  }, [pub.data, editor])

  return {...pub, editor}
}
