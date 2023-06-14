import {findParentNode} from '@tiptap/core'
import {
  draftsClient,
  getWebSiteClient,
  publicationsClient,
} from '@app/api-clients'
import {appInvalidateQueries, appQueryClient} from '@app/query-client'
import {Timestamp} from '@bufbuild/protobuf'
import {
  Document,
  group,
  Publication,
  statement,
  text,
  paragraph,
  GroupingContent,
  DocumentChange,
  WebPublicationRecord,
  serverChildrenToEditorChildren,
} from '@mintter/shared'
import {
  FetchQueryOptions,
  UseMutationOptions,
  QueryClient,
  useMutation,
  useQueries,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query'
import {queryKeys} from './query-keys'
import {useEffect, useMemo, useRef, useState} from 'react'
import {useBlockNote} from '@blocknote/react'
import {Editor, Node} from 'slate'
import {Extension} from '@tiptap/core'
import {PluginKey} from 'prosemirror-state'
import {NavRoute} from '@app/utils/navigation'
import {extractReferencedDocs} from './sites'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Block, DefaultBlockSchema, defaultProps, PartialBlock, StyledText, BlockSpec, PropSchema, BlockSchema, Props} from '@blocknote/core'
import {toast} from '@app/toast'

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
  children: PartialBlock<any>[]
  changes: DraftChangesState
  webUrl: string
}

export function useDraftState({
  editor,
  documentId,
  ...options
}: UseQueryOptions<DraftState> & {
  documentId: string
  editor: Editor
}) {
  return useQuery({
    queryKey: [queryKeys.EDITOR_DRAFT, documentId],
    enabled: !!documentId && !!editor,
    queryFn: async () => {
      const backendDraft = await draftsClient.getDraft({documentId: documentId})
      console.log(
        '🚀 ~ file: documents.ts:271 ~ queryFn: ~ backendDraft:',
        backendDraft,
      )
      const editorFormattedChildren: DraftState = {
        webUrl: backendDraft.webUrl,
        children: [],
        changes: {
          moves: [],
          changed: [],
          deleted: [],
        },
      }
      return editorFormattedChildren
    },
    ...options,
  })
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
  return Node.string(Node.get({children}, [0, 0, 0])) || ''
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
  changed: string[]
  deleted: string[]
}

type MoveBlockAction = {
  type: 'moveBlock'
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

function draftChangesReducer(
  state: DraftChangesState,
  action: DraftChangeAction,
): DraftChangesState {
  if (action.type === 'moveBlock') {
    return {
      ...state,
      moves: [...state.moves, action],
    }
  } else if (action.type === 'deleteBlock') {
    return {
      ...state,
      deleted: [...state.deleted, action.blockId],
      changed: state.changed.filter((blockId) => blockId !== action.blockId),
      moves: state.moves.filter((move) => move.blockId !== action.blockId),
    }
  } else if (action.type === 'changeBlock') {
    if (state.changed.indexOf(action.blockId) === -1) {
      return {
        ...state,
        changed: [...state.changed, action.blockId],
      }
    }
  }
  return state
}

export function useDraftEditor2(
  documentId?: string,
  opts?: {onEditorState?: (v: any) => void},
) {
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const draftState: DraftState | undefined = appQueryClient.getQueryData([
        queryKeys.EDITOR_DRAFT,
        documentId,
      ])
      if (!draftState) return
      const {changed, moves, deleted} = draftState.changes
      const changes: Array<DocumentChange> = [
        new DocumentChange({
          op: {
            case: 'setTitle',
            value: 'LOL is this your title?',
          },
        }),
        ...deleted.map((blockId) => {
          return new DocumentChange({
            op: {
              case: 'deleteBlock',
              value: blockId,
            },
          })
        }),
        ...moves.map(
          (move) =>
            new DocumentChange({
              op: {
                case: 'moveBlock',
                value: {
                  blockId: move.blockId,
                },
              },
            }),
        ),
        ...changed.map((blockId) => {
          // todo, get the block from the editor, somehow
          return new DocumentChange({
            op: {
              case: 'replaceBlock',
              value: {
                id: blockId,
                annotations: [],
                attributes: {},
                text: '',
                type: '',
              },
            },
          })
        }),
      ]
    },
  })

  // await draftsClient.updateDraft({
  //   documentId,
  //   changes: draftData.changes,
  // })

  // appInvalidateQueries([queryKeys.GET_DRAFT_LIST])
  // return null

  let debounceTimeout = useRef<number | null | undefined>(null)

  const changesKey = new PluginKey('hyperdocs-changes')

  const StateMonitorExtension = Extension.create({
    name: 'DraftStateMonitor',
    onUpdate() {
      let block = findBlock(this.editor.state.selection)
      console.log('🚀 ~ == block:', block)

      // appQueryClient.setQueryData(
      //   [queryKeys.EDITOR_DRAFT, documentId],
      //   (draftState: DraftState | undefined) => {
      //     if (!draftState) return undefined

      //     const actions: DraftChangeAction[] = []
      //     // @horacioh please .push() into actions!

      // if (
      //   selection &&
      //   selection.node &&
      //   selection.node.attrs.blockId
      // ) {
      //   const {node} = selection

      //   // Check if the selected node has a blockId attribute
      //   const blockId = node.attrs.blockId
      //   if (blockId) {
      //     console.log('Block ID:', blockId)
      //   }
      // }

      appQueryClient.setQueryData(
        [queryKeys.EDITOR_DRAFT, documentId],
        (draftState: DraftState | undefined) => {
          if (!draftState) return undefined

          const actions: DraftChangeAction[] = []
          // @horacioh please .push() into actions!

          return {
            ...draftState,
            // @horacioh please update children content?
            // children:
            changes: actions.reduce(draftChangesReducer, draftState.changes),
          }
        },
      )
      clearTimeout(debounceTimeout.current as any)
      //@ts-ignore
      debounceTimeout.current = setTimeout(() => {
        saveDraftMutation.mutate()
      }, 500)
    },
  })

  // let document = {
  //   // ...
  //   children: [
  //     {
  //       id: '1ertyuiop',
  //       type: 'paragraph',
  //       content: 'Hello world 1',
  //       annotations: [],
  //       attributes: {},
  //       children: [],
  //     },
  //     {
  //       id: '2ertyuiwz',
  //       type: 'paragraph',
  //       content: 'Hello world 2',
  //       annotations: [],
  //       attributes: {},
  //       children: [
  //         {
  //           id: '3ertyuiop',
  //           type: 'paragraph',
  //           content: 'Hello world 3',
  //           annotations: [],
  //           attributes: {},
  //           children: []
  //         }
  //       ]
  //     }
  //   ]
  // }

  // const initialContent = BlockToBlockNote(document);

  const editor = useBlockNote({
    onEditorContentChange(editor) {
      opts?.onEditorState?.(editor.topLevelBlocks)
      // mutate editor here
      // console.log('UPDATED', JSON.stringify(editor.topLevelBlocks))
    },
    // initialContent: initialContent,
    _tiptapOptions: {
      extensions: [StateMonitorExtension.configure({})],
    },
  })
  const draftState = useQuery({
    enabled: !!editor,
    queryFn: async () => {
      const serverDraft = await draftsClient.getDraft({
        documentId,
      })
      const topChildren = serverChildrenToEditorChildren(serverDraft.children)
      const draftState: DraftState = {
        children: topChildren,
        changes: {
          changed: [],
          deleted: [],
          moves: [],
        },
        webUrl: serverDraft.webUrl,
      }
      // convert data to editor blocks
      // return {} as DraftState
      return draftState
    },
    onSuccess: (draft: DraftState) => {
      if (draft.children.length) {
        editor?._tiptapEditor.commands.insertContent(draft.children)
      }
    },
  })

  return {
    editor,
  }
}

export type HyperDocsEditor = ReturnType<typeof useDraftEditor2>['editor']

export function useWriteDraftWebUrl(draftId?: string) {
  return useMutation({
    onMutate: (webUrl: string) => {
      let title: string
      // appQueryClient.setQueryData(
      //   [queryKeys.EDITOR_DRAFT, draftId],
      //   (editorDraft: EditorDraft | undefined) => {
      //     if (!editorDraft) return undefined
      //     let changes: DocumentChange[] = [
      //       ...editorDraft.changes,
      //       new DocumentChange({
      //         op: {
      //           case: 'setWebUrl',
      //           value: webUrl,
      //         },
      //       }),
      //     ]
      //     return {
      //       ...editorDraft,
      //       webUrl,
      //       changes,
      //     }
      //   },
      // )
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

function BlockToBlockNote(document: any) {
  const children = document.children
  if (children) {
    const result = AppendChildren(children)
    return result
  }
  return []
}

function AppendChildren(children: any) {
  if (!children || children.length === 0) return []
  const content = []
  for (const child of children) {
    const block = {
      id: child.id,
      type: child.type,
      props: {
        backgroundColor: "transparent",
        textColor: "black",
        textAlignment: "left"
      } as Props<PropSchema>,
      // props: {},
      content: [{
        type: 'text',
        text: child.content,
        styles: {},
      } as StyledText],
      children: AppendChildren(child.children),
    } as Block<BlockSchema>
    content.push(block)
  }
  return content
}

export const findBlock = findParentNode(
  (node) => node.type.name === 'blockContainer',
)

export function usePublicationEditor(documentId: string, versionId?: string) {
  const pub = usePublication({
    documentId,
    versionId,
  })
  // const editor = React.memo(() => {
  //   return
  // }, [pub.data])

  const editor = useBlockNote({
    // _tiptapOptions: {
    //   editable: false, // for some reason this doesn't work, but it works to set `editor.isEditable = false` after it is created
    // },
    onEditorContentChange(editor) {
      // opts?.onEditorState?.(editor.topLevelBlocks)
      // mutate editor here
      // console.log('UPDATED', JSON.stringify(editor.topLevelBlocks))
    },
    initialContent: [],
  })
  useEffect(() => {
    if (pub.data?.document && editor) {
      editor.isEditable = false
      editor._tiptapEditor.commands.insertContent(
        serverChildrenToEditorChildren(pub.data.document?.children || []),
      )
    }
  }, [pub.data, editor])

  return {...pub, editor}
}
