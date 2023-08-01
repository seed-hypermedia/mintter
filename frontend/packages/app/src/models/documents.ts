import {
  Block,
  BlockIdentifier,
  BlockNoteEditor,
  InlineContent,
  PartialBlock,
} from '@mintter/app/src/blocknote-core'
import {
  defaultReactSlashMenuItems,
  useBlockNote,
} from '@mintter/app/src/blocknote-react'
import {editorBlockToServerBlock} from '@mintter/app/src/client/editor-to-server'
import {HDBlockSchema, hdBlockSchema} from '@mintter/app/src/client/schema'
import {serverChildrenToEditorChildren} from '@mintter/app/src/client/server-to-editor'
import {createHyperdocsDocLinkPlugin} from '@mintter/app/src/editor/hyperdocs-link-plugin'
import {useListen} from '@mintter/app/src/app-context'
import {RightsideWidget} from '@mintter/app/src/components/rightside-block-widget'
import {toast} from '@mintter/app/src/toast'
import {useAppContext, useQueryInvalidator} from '@mintter/app/src/app-context'
import {insertFile} from '@mintter/app/src/editor/file'
import {insertImage} from '@mintter/app/src/editor/image'
import {insertVideo} from '@mintter/app/src/editor/video'
import {hostnameStripProtocol} from '@mintter/app/src/utils/site-hostname'
import {Timestamp} from '@bufbuild/protobuf'
import {
  Document,
  DocumentChange,
  GRPCClient,
  isHyperdocsScheme,
  isMintterGatewayLink,
  normalizeHyperdocsLink,
  Publication,
  WebPublicationRecord,
} from '@mintter/shared'
import {useWidgetViewFactory} from '@prosemirror-adapter/react'
import {
  FetchQueryOptions,
  useMutation,
  UseMutationOptions,
  useQueries,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query'
import {Editor, Extension, findParentNode} from '@tiptap/core'
import {Node} from 'prosemirror-model'
import {useEffect, useRef, useState} from 'react'
import {formattingToolbarFactory} from '../editor/formatting-toolbar'
import {queryKeys} from './query-keys'
import {extractReferencedDocs} from './sites'
import {useOpenUrl} from '@mintter/app/src/open-url'
import {useGRPCClient} from '../app-context'

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
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.GET_PUBLICATION_LIST],
    refetchOnMount: true,
    queryFn: async () => {
      const result = await grpcClient.publications.listPublications({})
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
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.GET_DRAFT_LIST],
    refetchOnMount: true,
    queryFn: async () => {
      const result = await grpcClient.drafts.listDrafts({
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
  const {queryClient} = useAppContext()
  const grpcClient = useGRPCClient()

  return useMutation({
    ...opts,
    mutationFn: async (documentId) => {
      await grpcClient.drafts.deleteDraft({documentId})
    },
    onSuccess: (response, documentId, context) => {
      queryClient.invalidate([queryKeys.GET_DRAFT_LIST])
      queryClient.client.setQueryData(
        [queryKeys.EDITOR_DRAFT, documentId],
        () => null,
      )
      opts?.onSuccess?.(response, documentId, context)
    },
  })
}

export function useDeletePublication(
  opts: UseMutationOptions<void, unknown, string>,
) {
  const invalidate = useQueryInvalidator()
  const grpcClient = useGRPCClient()
  return useMutation({
    ...opts,
    mutationFn: async (documentId) => {
      await grpcClient.publications.deletePublication({documentId})
    },
    onSuccess: (...args) => {
      invalidate([queryKeys.GET_PUBLICATION_LIST])
      opts?.onSuccess?.(...args)
    },
  })
}

export function useDraft({
  documentId,
  ...options
}: UseQueryOptions<EditorDraftState | null> & {
  documentId?: string
}) {
  const grpcClient = useGRPCClient()
  return useQuery(getDraftQuery(grpcClient, documentId, options))
}

function queryPublication(
  documentId?: string,
  versionId?: string,
): UseQueryOptions<Publication> | FetchQueryOptions<Publication> {
  const grpcClient = useGRPCClient()
  return {
    queryKey: [queryKeys.GET_PUBLICATION, documentId, versionId],
    enabled: !!documentId,
    queryFn: () =>
      grpcClient.publications.getPublication({
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
  // todo, bring this back
  // appQueryClient.prefetchQuery(queryPublication(documentId, versionId))
}

export function useDocumentVersions(
  documentId: string | undefined,
  versions: string[],
) {
  return useQueries({
    queries: versions.map((version) => queryPublication(documentId, version)),
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
  const grpcClient = useGRPCClient()

  const {client, invalidate} = useAppContext().queryClient
  return useMutation({
    ...opts,
    mutationFn: async ({
      webPub,
      draftId,
    }: {
      draftId: string
      webPub: WebPublicationRecord | undefined
    }) => {
      const draft = await grpcClient.drafts.getDraft({documentId: draftId})
      if (!draft) throw new Error('no draft found')
      const site = grpcClient.getRemoteWebClient(draft.webUrl)

      const pubs = await site.listWebPublications({}).catch((e) => {
        if (e.message.includes('failed to dial to site')) {
          throw new Error('Cannot connect to ' + draft.webUrl)
        }
      })

      const pub = await grpcClient.drafts.publishDraft({documentId: draftId})
      const doc = pub.document
      if (webPub && doc && webPub.hostname === pub.document?.webUrl) {
        const site = grpcClient.getRemoteWebClient(webPub.hostname)
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
      const documentId = pub.document?.id
      client.setQueryData([queryKeys.EDITOR_DRAFT, documentId], () => null)
      invalidate([queryKeys.GET_PUBLICATION_LIST])
      invalidate([queryKeys.PUBLICATION_CITATIONS])
      invalidate([queryKeys.GET_DRAFT_LIST])
      invalidate([queryKeys.GET_PUBLICATION, documentId])
      invalidate([queryKeys.PUBLICATION_CHANGES, documentId])
      invalidate([queryKeys.GET_DOC_SITE_PUBLICATIONS, documentId])
      invalidate([queryKeys.PUBLICATION_CITATIONS])
      invalidate([queryKeys.GET_SITE_PUBLICATIONS])
      opts?.onSuccess?.(pub, variables, context)

      setTimeout(() => {
        client.removeQueries([queryKeys.EDITOR_DRAFT, pub.document?.id])
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
  const draft = useDraft({documentId: input.documentId})
  return draft.data?.title || undefined
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

var defaultOnError = (err: any) => {
  console.log('== getDraftQuery ERROR', err)
}

function getDraftQuery(
  grpcClient: GRPCClient,
  documentId: string | undefined,
  opts?: UseQueryOptions<EditorDraftState | null>,
) {
  const {
    enabled = true,
    retry = false,
    onError = defaultOnError,
    ...restOpts
  } = opts || {}
  return {
    queryKey: [queryKeys.EDITOR_DRAFT, documentId],
    queryFn: async () => {
      let serverDraft: Document | null = null
      try {
        serverDraft = await grpcClient.drafts.getDraft({
          documentId,
        })
      } catch (error: any) {
        const message: string = error.message || ''
        if (!message.includes('no draft for entity')) {
          throw error
        }
        // draft will be null
      }
      if (!serverDraft) {
        return null
      }
      const topChildren = serverChildrenToEditorChildren(serverDraft.children)
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
    retry,
    enabled: !!documentId && enabled,
    onError,
    ...restOpts,
  }
}

export function useDraftEditor(
  documentId?: string,
  opts?: {onEditorState?: (v: any) => void},
) {
  let savingDebounceTimout = useRef<any>(null)
  const queryClient = useAppContext().queryClient
  const openUrl = useOpenUrl()
  const grpcClient = useGRPCClient()
  const {invalidate, client} = queryClient
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!editor) return
      const draftState: EditorDraftState | undefined = client.getQueryData([
        queryKeys.EDITOR_DRAFT,
        documentId,
      ])
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
        const childGroup = getBlockGroup(blockId)
        if (!currentBlock) return
        if (childGroup) {
          currentBlock.props.childrenType = childGroup.type
            ? childGroup.type
            : 'group'
          if (childGroup.start)
            currentBlock.props.start = childGroup.start.toString()
        }
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
      client.setQueryData(
        [queryKeys.EDITOR_DRAFT, documentId],
        (state: EditorDraftState | undefined) => {
          if (!state) return undefined
          return {
            ...state,
            changes: createEmptyChanges(),
          }
        },
      )
      await grpcClient.drafts.updateDraft({
        documentId,
        changes,
      })
    },
    retry: false,
    onError: (err) => {
      console.error('Failed to save draft', err)
    },
  })

  let lastBlocks = useRef<Record<string, HDBlock>>({})
  let lastBlockParent = useRef<Record<string, string>>({})
  let lastBlockLeftSibling = useRef<Record<string, string>>({})
  let isReady = useRef<boolean>(false)

  function prepareBlockObservations(
    blocks: Block<typeof hdBlockSchema>[],
    parentId: string,
  ) {
    if (isReady.current) {
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
  }

  function getBlockGroup(blockId: BlockIdentifier) {
    const [editor] = readyThings.current
    const tiptap = editor?._tiptapEditor
    if (tiptap) {
      const id = typeof blockId === 'string' ? blockId : blockId.id
      let group: {type: string; start?: number} | undefined
      tiptap.state.doc.firstChild!.descendants((node: Node) => {
        if (typeof group !== 'undefined') {
          return false
        }

        if (node.attrs.id !== id) {
          return true
        }

        node.descendants((child: Node) => {
          if (child.attrs.listType && child.type.name === 'blockGroup') {
            group = {
              type: child.attrs.listType,
              start: child.attrs.start,
            }
            return false
          }
          return true
        })

        return true
      })

      return group
    }

    return undefined
  }

  function handleAfterReady() {
    const [editor, draft] = readyThings.current
    const tiptap = editor?._tiptapEditor
    if (tiptap && draft) {
      setGroupTypes(tiptap, draft.children)
    }
    if (tiptap && !tiptap.isFocused) {
      editor._tiptapEditor.commands.focus()
    }
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
    isReady.current = true
    handleAfterReady()
  }

  const editor = useBlockNote<typeof hdBlockSchema>({
    onEditorContentChange(editor: BlockNoteEditor<typeof hdBlockSchema>) {
      opts?.onEditorState?.(editor.topLevelBlocks)
      if (!readyThings.current[0] || !readyThings.current[1]) return

      // trim empty blocks from the end of the document before treating them.
      // TODO: Deal with deleting blocks
      // let _blocks = editor.topLevelBlocks.reduceRight((acc, block) => {
      //   return acc.length === 0 &&
      //     block.content.length == 0 &&
      //     (!['image', 'file'].includes(block.type) ||
      //       !block.props.url ||
      //       block.type !== 'embed' ||
      //       block.props.ref !== 'hd://d/undefined')
      //     ? acc
      //     : [block].concat(acc)
      // }, [])

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
              type: 'embed',
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
        if (!isReady.current) return
        saveDraftMutation.mutate()
      }, 500)

      client.setQueryData(
        [queryKeys.EDITOR_DRAFT, documentId],
        (state: EditorDraftState | undefined) => {
          if (!state) {
            console.warn('no editor state yet!')
            return
          }
          // console.log('applying draft changes', {
          //   changed: [...state.changes.changed].map(
          //     (change) => lastBlocks.current[change],
          //   ),
          //   moves: state.changes.moves,
          //   deleted: [...state.changes.deleted],
          // })
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
    linkExtensionOptions: {
      queryClient,
      openUrl,
    },
    onEditorReady: (e) => {
      readyThings.current[0] = e
      handleMaybeReady()
    },
    uiFactories: {
      formattingToolbarFactory,
    },
    blockSchema: hdBlockSchema,
    // @ts-expect-error
    slashCommands: [
      ...defaultReactSlashMenuItems.slice(0, 2),
      insertImage,
      insertFile,
      insertVideo,
      ...defaultReactSlashMenuItems.slice(2),
    ],
    _tiptapOptions: {
      extensions: [
        Extension.create({
          name: 'hyperdocs-link',
          addProseMirrorPlugins() {
            return [createHyperdocsDocLinkPlugin(queryClient).plugin]
          },
        }),
      ],
    },
  })

  useListen(
    'select_all',
    () => {
      if (editor) {
        if (!editor?._tiptapEditor.isFocused) {
          editor.focus()
        }
        editor?._tiptapEditor.commands.selectAll()
      }
    },
    [editor],
  )

  const draft = useQuery(
    getDraftQuery(grpcClient, documentId, {
      enabled: !!editor,
      onSuccess: (draft: EditorDraftState | null) => {
        readyThings.current[1] = draft
        handleMaybeReady()
      },
      retry: false,
      onError: (err) => {
        console.log('== DRAFT FETCH ERROR', err)
      },
    }),
  )

  // both the publication data and the editor are asyncronously loaded
  // using a ref to avoid extra renders, and ensure the editor is available and ready
  const readyThings = useRef<[HyperDocsEditor | null, EditorDraftState | null]>(
    [null, draft.data || null],
  )

  useEffect(() => {
    return () => {
      clearTimeout(savingDebounceTimout.current)
      const state: EditorDraftState | undefined = client.getQueryData([
        queryKeys.EDITOR_DRAFT,
        documentId,
      ])
      const {changes} = state || {}
      if (!changes) return
      saveDraftMutation
        .mutateAsync()
        .then(() => {
          client.removeQueries([queryKeys.EDITOR_DRAFT, documentId])
          invalidate([queryKeys.GET_DRAFT_LIST])
        })
        .catch((e) => {
          toast.error('Draft changes were not saved correctly.')
          console.error(e)
        })
    }
  }, [])

  return {
    editor,
    query: draft,
    mutation: saveDraftMutation,
  }
}

export type HyperDocsEditor = Exclude<
  ReturnType<typeof useDraftEditor>['editor'],
  null
>

export function useWriteDraftWebUrl(draftId?: string) {
  const {invalidate, client} = useAppContext().queryClient
  const grpcClient = useGRPCClient()
  return useMutation({
    onMutate: (webUrl: string) => {
      let title: string

      client.setQueryData(
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
      const draftData: EditorDraftState | undefined = client.getQueryData([
        queryKeys.EDITOR_DRAFT,
        draftId,
      ])
      if (!draftData) {
        throw new Error(
          'failed to access editor from useWriteDraftWebUrl mutation',
        )
      }
      await grpcClient.drafts.updateDraft({
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

      invalidate([queryKeys.GET_DRAFT_LIST])
      return null
    },
    onSuccess: (response, webUrl) => {
      client.setQueryData(
        [queryKeys.EDITOR_DRAFT, draftId],
        (draft: EditorDraftState | undefined) => {
          if (!draft) return draft
          return {...draft, webUrl}
        },
      )
    },
  })
}

export const findBlock = findParentNode(
  (node) => node.type.name === 'blockContainer',
)

function applyPubToEditor(editor: HyperDocsEditor, pub: Publication) {
  const editorBlocks = serverChildrenToEditorChildren(
    pub.document?.children || [],
  )
  // editor._tiptapEditor.commands.clearContent()
  editor.replaceBlocks(editor.topLevelBlocks, editorBlocks)
  setGroupTypes(editor._tiptapEditor, editorBlocks)
  // editor._tiptapEditor.commands.setContent(editorBlocks)
}

export function usePublicationEditor(documentId: string, versionId?: string) {
  const pub = usePublication({
    documentId,
    versionId,
    enabled: !!documentId,
    onSuccess: (pub: Publication) => {
      readyThings.current[1] = pub
      const readyEditor = readyThings.current[0]
      if (readyEditor) {
        readyEditor.isEditable = false // this is the way
        applyPubToEditor(readyEditor, pub)
      }
    },
  })

  const widgetViewFactory = useWidgetViewFactory()

  // both the publication data and the editor are asyncronously loaded
  // using a ref to avoid extra renders, and ensure the editor is available and ready
  const readyThings = useRef<[HyperDocsEditor | null, Publication | null]>([
    null,
    pub.data || null,
  ])

  const currentVersion = useRef<string | null>(null)

  // this effect let you change the content of the editor when the version from the version panel is changed.
  // without this the editor do not update.
  useEffect(() => {
    const readyPub = readyThings.current[1]
    if (readyPub) {
      let newVersion = pub.data?.version

      if (newVersion != currentVersion.current) {
        const editor = readyThings.current[0]

        if (editor && pub.data) {
          editor?._tiptapEditor.commands.clearContent()
          const editorBlocks = serverChildrenToEditorChildren(
            pub.data.document?.children || [],
          )
          setGroupTypes(editor._tiptapEditor, editorBlocks)
          editor?.replaceBlocks(editor.topLevelBlocks, editorBlocks)
        }
      }
    }
  }, [pub.data])

  const {queryClient} = useAppContext()
  const openUrl = useOpenUrl()

  // careful using this editor too quickly. even when it it appears, it may not be "ready" yet, and bad things happen if you replaceBlocks too early
  const editor: HyperDocsEditor | null = useBlockNote<HDBlockSchema>({
    linkExtensionOptions: {
      queryClient,
      openUrl,
    },
    editable: false,
    blockSchema: hdBlockSchema,
    onEditorReady: (e) => {
      readyThings.current[0] = e
      const readyPub = readyThings.current[1]
      if (readyPub) {
        applyPubToEditor(e, readyPub)
      }
    },
    uiFactories: {
      rightsideFactory: widgetViewFactory({
        component: RightsideWidget,
        as: 'div',
      }),
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
      if (isMintterGatewayLink(leaf.href) || isHyperdocsScheme(leaf.href)) {
        const hdLink = normalizeHyperdocsLink(leaf.href)

        console.log(`== ~ extractEmbedRefOfLink ~ hdLink:`, hdLink)
        if (hdLink) return hdLink
      }
    }
  }
  return false
}

function setGroupTypes(
  tiptap: Editor,
  blocks: PartialBlock<typeof hdBlockSchema>[],
) {
  blocks.forEach((block: PartialBlock<typeof hdBlockSchema>) => {
    tiptap.state.doc.descendants((node: Node, pos: number) => {
      if (
        node.attrs.id === block.id &&
        block.props &&
        block.props.childrenType
      ) {
        node.descendants((child: Node, childPos: number) => {
          if (child.type.name === 'blockGroup') {
            setTimeout(() => {
              let tr = tiptap.state.tr
              tr = block.props?.start
                ? tr.setNodeMarkup(pos + childPos + 1, null, {
                    listType: block.props?.childrenType,
                    start: parseInt(block.props?.start),
                  })
                : tr.setNodeMarkup(pos + childPos + 1, null, {
                    listType: block.props?.childrenType,
                  })
              tiptap.view.dispatch(tr)
            })
            return false
          }
        })
      }
    })
    if (block.children) {
      setGroupTypes(tiptap, block.children)
    }
  })
}
