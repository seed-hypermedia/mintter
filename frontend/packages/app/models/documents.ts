import {Timestamp} from '@bufbuild/protobuf'
import {
  useAppContext,
  useListen,
  useQueryInvalidator,
} from '@mintter/app/app-context'
import {useOpenUrl} from '@mintter/app/open-url'
import {slashMenuItems} from '@mintter/app/src/slash-menu-items'
import {trpc} from '@mintter/desktop/src/trpc'
import {
  Block,
  BlockIdentifier,
  BlockNoteEditor,
  HMBlockSchema,
  createHypermediaDocLinkPlugin,
  hmBlockSchema,
  useBlockNote,
} from '@mintter/editor'
import {
  BlockNode,
  Document,
  DocumentChange,
  GRPCClient,
  HMBlock,
  HMInlineContent,
  ListPublicationsResponse,
  Publication,
  fromHMBlock,
  isHypermediaScheme,
  isPublicGatewayLink,
  normlizeHmId,
  shortenPath,
  toHMBlock,
  unpackDocId,
  hmDocument,
  hmPublication,
  writeableStateStream,
} from '@mintter/shared'
import {
  FetchQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {Editor, Extension, findParentNode} from '@tiptap/core'
import {Node} from 'prosemirror-model'
import {useEffect, useMemo, useRef} from 'react'
import {useGRPCClient} from '../app-context'
import {PublicationRouteContext, useNavRoute} from '../utils/navigation'
import {pathNameify} from '../utils/path'
import {usePublicationInContext} from './publication'
import {queryKeys} from './query-keys'
import {toast} from '../toast'

function createEmptyChanges(): DraftChangesState {
  return {
    changed: new Set<string>(),
    deleted: new Set<string>(),
    moves: [],
  }
}

export function usePublicationList(
  opts?: UseQueryOptions<ListPublicationsResponse> & {trustedOnly: boolean},
) {
  const {trustedOnly, ...queryOpts} = opts || {}
  const grpcClient = useGRPCClient()
  return useQuery({
    ...queryOpts,
    queryKey: [
      queryKeys.GET_PUBLICATION_LIST,
      trustedOnly ? 'trusted' : 'global',
    ],
    refetchOnMount: true,
    queryFn: async () => {
      const result = await grpcClient.publications.listPublications({
        trustedOnly: trustedOnly,
      })
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
  const diagnosis = useDraftDiagnosis()
  return useQuery(queryDraft(grpcClient, documentId, diagnosis, options))
}

export function queryPublication(
  grpcClient: GRPCClient,
  documentId?: string,
  versionId?: string,
  trustedOnly?: boolean,
): UseQueryOptions<Publication> | FetchQueryOptions<Publication> {
  return {
    queryKey: [queryKeys.GET_PUBLICATION, documentId, versionId, trustedOnly],
    enabled: !!documentId,
    queryFn: () =>
      grpcClient.publications.getPublication({
        trustedOnly,
        documentId,
        version: versionId,
      }),
  }
}
export function usePublication({
  id,
  version,
  trustedOnly,
  ...options
}: UseQueryOptions<Publication> & {
  id?: string
  version?: string
  trustedOnly?: boolean
}) {
  const grpcClient = useGRPCClient()
  return useQuery({
    ...queryPublication(grpcClient, id, version, trustedOnly),
    ...options,
  })
}

export function useDocumentVersions(
  documentId: string | undefined,
  versions: string[],
) {
  const grpcClient = useGRPCClient()
  return useQueries({
    queries: versions.map((version) =>
      queryPublication(grpcClient, documentId, version),
    ),
  })
}

function sortDocuments(a?: Timestamp, b?: Timestamp) {
  let dateA = a ? a.toDate() : 0
  let dateB = b ? b.toDate() : 1

  // @ts-ignore
  return dateB - dateA
}

export function getDefaultShortname(
  docTitle: string | undefined,
  docId: string,
) {
  const unpackedId = unpackDocId(docId)
  const idShortname = unpackedId ? unpackedId.eid.slice(0, 5).toLowerCase() : ''
  const shortname = docTitle ? pathNameify(docTitle) : idShortname
  return shortenPath(shortname)
}

function useDraftDiagnosis() {
  const appendDraft = trpc.diagnosis.appendDraftLog.useMutation()
  const completeDraft = trpc.diagnosis.completeDraftLog.useMutation()
  return {
    append(draftId, event) {
      return appendDraft.mutateAsync({draftId, event})
    },
    complete(draftId, event) {
      return completeDraft.mutateAsync({draftId, event})
    },
  }
}
type DraftDiagnosis = ReturnType<typeof useDraftDiagnosis>

function changesToJSON(changes: DocumentChange[]) {
  return changes.map((change) => {
    if (change.op.case === 'replaceBlock') {
      return {...change.op}
    }
    return change.op
  })
}

export function usePublishDraft(
  opts?: UseMutationOptions<
    {pub: Publication; pubContext: PublicationRouteContext},
    unknown,
    {
      draftId: string
    }
  >,
) {
  const queryClient = useAppContext().queryClient
  const markDocPublish = trpc.welcoming.markDocPublish.useMutation()
  const grpcClient = useGRPCClient()
  const route = useNavRoute()
  const draftRoute = route.key === 'draft' ? route : undefined
  const draftPubContext = draftRoute?.pubContext
  const draftGroupContext =
    draftPubContext?.key === 'group' ? draftPubContext : undefined
  const {client, invalidate} = useAppContext().queryClient
  const diagnosis = useDraftDiagnosis()
  return useMutation({
    ...opts,
    mutationFn: async ({draftId}: {draftId: string}) => {
      const draft = await grpcClient.drafts.getDraft({documentId: draftId})
      await diagnosis.append(draftId, {
        key: 'getDraft',
        value: hmDocument(draft),
      })
      if (!draft) throw new Error('no draft found')
      let lastChildIndex = draft.children.length - 1
      const changes: DocumentChange[] = []
      while (true) {
        const lastChild = draft.children[lastChildIndex]
        if (
          !lastChild.block?.text &&
          !['image', 'embed', 'file', 'video'].includes(lastChild.block!.type)
        ) {
          if (lastChild.children.length === 0) {
            changes.push(
              new DocumentChange({
                op: {
                  case: 'deleteBlock',
                  value: lastChild.block!.id,
                },
              }),
            )
          } else {
            const nonEmptyChild = lastChild.children.some(
              (block) =>
                block.block?.text ||
                ['image', 'embed', 'file', 'video'].includes(block.block!.type),
            )
            if (!nonEmptyChild) {
              changes.push(
                new DocumentChange({
                  op: {
                    case: 'deleteBlock',
                    value: lastChild.block!.id,
                  },
                }),
              )
            } else break
          }
        } else break
        lastChildIndex -= 1
      }
      if (changes.length) {
        await diagnosis.append(draftId, {
          key: 'will.updateDraft',
          note: 'removing extra blocks before publication',
          value: changesToJSON(changes),
        })
        await grpcClient.drafts.updateDraft({
          documentId: draftId,
          changes,
        })
      }
      const pub = await grpcClient.drafts.publishDraft({documentId: draftId})
      await diagnosis.complete(draftId, {
        key: 'did.publishDraft',
        value: hmPublication(pub),
      })
      const isFirstPublish = await markDocPublish.mutateAsync(draftId)
      const publishedId = pub.document?.id
      if (draftGroupContext && publishedId) {
        let docTitle: string | undefined = (
          queryClient.client.getQueryData([
            queryKeys.EDITOR_DRAFT,
            draftId,
          ]) as any
        )?.title
        const publishPathName = draftGroupContext.pathName
          ? draftGroupContext.pathName
          : getDefaultShortname(docTitle, publishedId)
        if (publishPathName) {
          await grpcClient.groups.updateGroup({
            id: draftGroupContext.groupId,
            updatedContent: {
              [publishPathName]: `${publishedId}?v=${pub.version}`,
            },
          })
          return {
            isFirstPublish,
            pub,
            pubContext: {
              key: 'group',
              groupId: draftGroupContext.groupId,
              pathName: publishPathName,
            },
          }
        }
      }
      return {isFirstPublish, pub, pubContext: draftPubContext}
    },
    onSuccess: (
      result: {pub: Publication; pubContext: PublicationRouteContext},
      variables,
      context,
    ) => {
      const documentId = result.pub.document?.id
      client.setQueryData([queryKeys.EDITOR_DRAFT, documentId], () => null)
      invalidate([queryKeys.GET_PUBLICATION_LIST])
      invalidate([queryKeys.PUBLICATION_CITATIONS])
      invalidate([queryKeys.GET_DRAFT_LIST])
      invalidate([queryKeys.GET_PUBLICATION, documentId])
      invalidate([queryKeys.PUBLICATION_CHANGES, documentId])
      invalidate([queryKeys.ENTITY_TIMELINE, documentId])
      invalidate([queryKeys.PUBLICATION_CITATIONS])
      if (draftGroupContext) {
        invalidate([queryKeys.GET_GROUP_CONTENT, draftGroupContext.groupId])
        invalidate([queryKeys.GET_GROUPS_FOR_DOCUMENT, documentId])
      }
      opts?.onSuccess?.(result, variables, context)

      setTimeout(() => {
        client.removeQueries([queryKeys.EDITOR_DRAFT, result.pub.document?.id])
        // otherwise it will re-query for a draft that no longer exists and an error happens
      }, 250)
    },
  })
}

export type EditorDraftState = {
  id: string
  children: Array<HMBlock>
  title: string
  changes: DraftChangesState
  webUrl: string
}

export function useDraftTitle(
  input: UseQueryOptions<EditorDraftState> & {documentId?: string | undefined},
) {
  const draft = useDraft({documentId: input.documentId})
  return draft.data?.title || undefined
}

function getTitleFromInline(children: Array<HMInlineContent>): string {
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

export function getTitleFromContent(children: HMBlock[]): string {
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

export function queryDraft(
  grpcClient: GRPCClient,
  documentId: string | undefined,
  diagnosis?: DraftDiagnosis,
  opts?: UseQueryOptions<EditorDraftState | null>,
) {
  const {enabled = true, retry = false, ...restOpts} = opts || {}
  return {
    queryKey: [queryKeys.EDITOR_DRAFT, documentId],
    queryFn: async () => {
      let serverDraft: Document | null = null
      try {
        serverDraft = await grpcClient.drafts.getDraft({
          documentId,
        })
        diagnosis?.append(documentId!, {
          key: 'getDraft',
          value: hmDocument(serverDraft),
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
      const topChildren = toHMBlock(serverDraft.children)
      const draftState: EditorDraftState = {
        children: topChildren,
        changes: {
          changed: new Set<string>(),
          deleted: new Set<string>(),
          moves: [],
        },
        // @ts-expect-error
        webUrl: serverDraft.webUrl,
        title: serverDraft.title,
        id: serverDraft.id,
      }
      return draftState
    },
    retry,
    enabled: !!documentId && enabled,
    ...restOpts,
  }
}

export function useDraftEditor(documentId?: string) {
  let savingDebounceTimout = useRef<any>(null)
  const queryClient = useAppContext().queryClient
  const openUrl = useOpenUrl()
  const grpcClient = useGRPCClient()
  const {invalidate, client} = queryClient
  const diagnosis = useDraftDiagnosis()
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!editor) return
      const draftState: EditorDraftState | undefined = client.getQueryData([
        queryKeys.EDITOR_DRAFT,
        documentId,
      ])
      if (!draftState) return

      const {changed, moves, deleted} = draftState.changes
      const changes: Array<DocumentChange> = []

      if (draft.data?.children.length == 0) {
        // This means the draft is empty and we need to prepent a "move block" operation so it will not break
        let firstBlock = editor.topLevelBlocks[0]
        changes.push(
          new DocumentChange({
            op: {
              case: 'moveBlock',
              value: {
                blockId: firstBlock.id,
                leftSibling: '',
                parent: '',
              },
            },
          }),
        )
      }

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
        const serverBlock = fromHMBlock(currentBlock)
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
      if (!documentId) throw new Error('Cannot persist a draft without id')
      diagnosis.append(documentId, {
        key: 'will.updateDraft',
        // note: 'regular updateDraft',
        value: changesToJSON(changes),
      })
      if (changes.length) {
        await grpcClient.drafts.updateDraft({
          documentId,
          changes,
        })
      }
    },
    retry: false,
    onError: (err) => {
      console.error('Failed to save draft', err)
    },
  })

  let lastBlocks = useRef<Record<string, HMBlock>>({})
  let lastBlockParent = useRef<Record<string, string>>({})
  let lastBlockLeftSibling = useRef<Record<string, string>>({})
  let isReady = useRef<boolean>(false)

  function prepareBlockObservations(
    blocks: Block<typeof hmBlockSchema>[],
    parentId: string,
  ) {
    blocks.forEach((block, index) => {
      const leftSibling = index === 0 ? '' : blocks[index - 1]?.id
      lastBlockParent.current[block.id] = parentId
      lastBlockLeftSibling.current[block.id] = leftSibling
      // @ts-expect-error
      lastBlocks.current[block.id] = block
      if (block.children) {
        prepareBlockObservations(block.children, block.id)
      }
    })
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

  const draft = useQuery(
    queryDraft(grpcClient, documentId, diagnosis, {
      // enabled: !!editor,
      onSuccess: (draft: EditorDraftState | null) => {
        readyThings.current[1] = draft
        handleMaybeReady()
      },
      retry: false,
      onError: (err) => {
        console.error('DRAFT FETCH ERROR', err)
      },
    }),
  )

  const [writeEditorState, editorState] = useRef(
    writeableStateStream<any>(null),
  ).current

  const editor = useBlockNote<typeof hmBlockSchema>({
    onEditorContentChange(editor: BlockNoteEditor<typeof hmBlockSchema>) {
      writeEditorState(editor.topLevelBlocks)

      if (!isReady.current) return
      if (!readyThings.current[0] || !readyThings.current[1]) return

      let changedBlockIds = new Set<string>()
      let possiblyRemovedBlockIds = new Set<string>(
        Object.keys(lastBlocks.current),
      )
      const nextBlocks: Record<string, HMBlock> = {}
      const moves: MoveBlockAction[] = []
      function observeBlocks(
        blocks: Block<typeof hmBlockSchema>[],
        parentId: string,
      ) {
        blocks.forEach((block, index) => {
          if (block.type === 'imagePlaceholder' && block.props.src) {
            editor.updateBlock(block, {
              type: 'image',
              props: {
                url: block.props.src,
                name: '',
              },
            })
          }
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
            const {block: currentBlock, nextBlock} =
              editor.getTextCursorPosition()
            if (nextBlock) {
              editor.setTextCursorPosition(nextBlock)
            } else {
              editor.insertBlocks(
                [
                  {
                    type: 'paragraph',
                    content: [],
                  },
                ],
                currentBlock,
                'after',
              )
              editor.setTextCursorPosition(
                editor.getTextCursorPosition().nextBlock!,
              )
            }
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
          // @ts-expect-error
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

          changedBlockIds.forEach((blockId) =>
            state.changes.changed.add(blockId),
          )
          moves.forEach((move) => state.changes.moves.push(move))
          removedBlockIds.forEach((blockId) =>
            state.changes.deleted.add(blockId),
          )
          return {
            ...state,
            changes: state.changes,
          }
        },
      )
    },
    linkExtensionOptions: {
      openOnClick: false,
      queryClient,
      openUrl,
    },

    onEditorReady: (e) => {
      readyThings.current[0] = e
      handleMaybeReady()
    },
    blockSchema: hmBlockSchema,
    slashMenuItems,

    _tiptapOptions: {
      extensions: [
        Extension.create({
          name: 'hypermedia-link',
          addProseMirrorPlugins() {
            return [
              createHypermediaDocLinkPlugin({
                queryClient,
              }).plugin,
            ]
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

  // both the publication data and the editor are asyncronously loaded
  // using a ref to avoid extra renders, and ensure the editor is available and ready
  const readyThings = useRef<[HyperDocsEditor | null, EditorDraftState | null]>(
    [null, draft.data || null],
  )

  useEffect(() => {
    return () => {
      // this runs when the editor is unmounted, to make sure it gets saved even if a keystroke just happened
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
    // Can't add anything to this deps array bc it will cause an infinite look in the draft page
  }, [])

  return {
    editor,
    editorState,
    query: draft,
    mutation: saveDraftMutation,
  }
}

export function useDraftTitleInput(draftId: string) {
  const draft = useDraft({documentId: draftId})
  const savingDebounceTimout = useRef<any>(null)
  const queryClient = useQueryClient()
  const client = useGRPCClient()
  const saveTitleMutation = useMutation({
    mutationFn: async (title: string) => {
      const changes: Array<DocumentChange> = [
        new DocumentChange({
          op: {
            case: 'setTitle',
            value: title,
          },
        }),
      ]
      await client.drafts.updateDraft({
        documentId: draftId,
        changes,
      })
    },
  })
  const title = draft.data?.title || undefined
  return {
    title,
    onTitle: (inputTitle: string) => {
      // avoid multiline values that may be pasted into the title
      const title = inputTitle.split('\n').join(' ')
      queryClient.setQueryData(
        [queryKeys.EDITOR_DRAFT, draftId],
        (state: EditorDraftState | undefined) => {
          return {...state, title}
        },
      )
      clearTimeout(savingDebounceTimout.current)
      savingDebounceTimout.current = setTimeout(() => {
        saveTitleMutation.mutate(title)
      }, 500)
    },
  }
}

export type HyperDocsEditor = Exclude<
  ReturnType<typeof useDraftEditor>['editor'],
  null
>

export const findBlock = findParentNode(
  (node) => node.type.name === 'blockContainer',
)

function applyPubToEditor(editor: HyperDocsEditor, pub: Publication) {
  const editorBlocks = toHMBlock(pub.document?.children || [])
  // editor._tiptapEditor.commands.clearContent()
  editor.replaceBlocks(editor.topLevelBlocks, editorBlocks)
  setGroupTypes(editor._tiptapEditor, editorBlocks)
  // editor._tiptapEditor.commands.setContent(editorBlocks)
}

function generateBlockId(length: number = 8): string {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export function useCreatePublication() {
  const invalidate = useQueryInvalidator()
  const client = useGRPCClient()
  return useMutation({
    mutationFn: async (title: string) => {
      const draft = await client.drafts.createDraft({})
      const blockId = generateBlockId()
      await client.drafts.updateDraft({
        documentId: draft.id,
        changes: [
          new DocumentChange({
            op: {
              case: 'setTitle',
              value: title,
            },
          }),
          new DocumentChange({
            op: {
              case: 'moveBlock',
              value: {
                blockId,
                leftSibling: '',
                parent: '',
              },
            },
          }),
          new DocumentChange({
            op: {
              case: 'replaceBlock',
              value: {id: blockId, type: 'paragraph', text: title},
            },
          }),
        ],
      })
      await client.drafts.publishDraft({documentId: draft.id})
      return draft.id
    },
    onSuccess: (draftId) => {
      invalidate([queryKeys.GET_PUBLICATION_LIST])
      invalidate([queryKeys.ENTITY_TIMELINE, draftId])
    },
  })
}

export function usePublicationEditor(
  documentId: string,
  versionId?: string,
  pubContext?: PublicationRouteContext | undefined,
) {
  const pub = usePublicationInContext({
    documentId,
    versionId,
    pubContext,
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
          const editorBlocks = toHMBlock(pub.data.document?.children || [])
          setGroupTypes(editor._tiptapEditor, editorBlocks as any)
          editor?.replaceBlocks(editor.topLevelBlocks, editorBlocks)
        }
      }
    }
  }, [pub.data])

  const {queryClient} = useAppContext()
  const openUrl = useOpenUrl()

  // careful using this editor too quickly. even when it it appears, it may not be "ready" yet, and bad things happen if you replaceBlocks too early
  const editor: HyperDocsEditor | null = useBlockNote<HMBlockSchema>({
    linkExtensionOptions: {
      queryClient,
      openUrl,
      openOnClick: true, // this is default, but just to be explicit.
    },
    editable: false,
    blockSchema: hmBlockSchema,
    onEditorReady: (e: Editor) => {
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
      if (isPublicGatewayLink(leaf.href) || isHypermediaScheme(leaf.href)) {
        const hmLink = normlizeHmId(leaf.href)
        if (hmLink) return hmLink
      }
    }
  }
  return false
}

function setGroupTypes(tiptap: Editor, blocks: Array<Partial<HMBlock>>) {
  blocks.forEach((block: Partial<HMBlock>) => {
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

export function useDocTextContent(pub?: Publication) {
  return useMemo(() => {
    let res = ''
    function extractContent(blocks: Array<BlockNode>) {
      blocks.forEach((bn) => {
        res += extractBlockText(bn)
      })

      return res
    }

    function extractBlockText({block, children}: BlockNode) {
      let content = ''
      if (!block) return content
      content += block.text

      if (children.length) {
        let nc = extractContent(children)
        content += nc
      }

      return content
    }

    if (pub?.document?.children.length) {
      res = extractContent(pub.document?.children)
    }

    return res
  }, [pub])
}
