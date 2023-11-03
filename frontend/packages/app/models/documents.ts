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
  BlockIdentifier,
  BlockNoteEditor,
  Block as EditorBlock,
  createHypermediaDocLinkPlugin,
  hmBlockSchema,
  useBlockNote,
} from '@mintter/editor'
import {
  Block,
  BlockNode,
  Document,
  DocumentChange,
  GRPCClient,
  HMBlock,
  HMInlineContent,
  ListPublicationsResponse,
  Publication,
  fromHMBlock,
  hmDocument,
  hmPublication,
  isHypermediaScheme,
  isPublicGatewayLink,
  normlizeHmId,
  toHMBlock,
  unpackDocId,
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
import {useMachine} from '@xstate/react'
import _ from 'lodash'
import {Node} from 'prosemirror-model'
import {useEffect, useMemo, useRef} from 'react'
import {ContextFrom, createActor, fromPromise} from 'xstate'
import {useGRPCClient} from '../app-context'
import {
  NavRoute,
  PublicationRouteContext,
  useNavRoute,
} from '../utils/navigation'
import {pathNameify} from '../utils/path'
import {DraftStatusContext, draftMachine} from './draft-machine'
import {queryKeys} from './query-keys'
import {UpdateDraftResponse} from '@mintter/shared/src/client/.generated/documents/v1alpha/documents_pb'
<<<<<<< HEAD
import {handleDragReplace} from '@mintter/editor'
=======
import {useNavigate} from '../utils/useNavigate'
>>>>>>> 1c0bbdde (fix(draft): fixing undeletable draft)

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
      queryClient.client.removeQueries({
        queryKey: [queryKeys.GET_DRAFT, documentId],
      })
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

export function queryPublication(
  grpcClient: GRPCClient,
  documentId?: string,
  versionId?: string,
  trustedOnly?: boolean,
): UseQueryOptions<Publication> | FetchQueryOptions<Publication> {
  return {
    queryKey: [queryKeys.GET_PUBLICATION, documentId, versionId, trustedOnly],
    enabled: !!documentId,
    // retry: false, // to test error handling faster
    // default is 5. the backend waits ~1s for discovery, so we retry for a little while in case document is on its way.
    retry: 10,
    // about 15 seconds total right now
    queryFn: () =>
      grpcClient.publications.getPublication({
        trustedOnly,
        documentId,
        version: versionId,
      }),
  }
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
// TODO: Duplicate (apps/site/server/routers/_app.ts#~187)
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
  const kebabName = docTitle ? pathNameify(docTitle) : idShortname
  const shortName =
    kebabName.length > 40 ? kebabName.substring(0, 40) : kebabName
  return shortName
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
      const pub = await grpcClient.drafts.publishDraft({documentId: draftId})
      await diagnosis.complete(draftId, {
        key: 'did.publishDraft',
        value: hmPublication(pub),
      })
      const isFirstPublish = await markDocPublish.mutateAsync(draftId)
      const publishedId = pub.document?.id
      if (draftGroupContext && publishedId) {
        let docTitle: string | undefined = (
          queryClient.client.getQueryData([queryKeys.GET_DRAFT, draftId]) as any
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
      opts?.onSuccess?.(result, variables, context)
      invalidate([queryKeys.GET_PUBLICATION_LIST])
      invalidate([queryKeys.PUBLICATION_CITATIONS])
      invalidate([queryKeys.GET_DRAFT_LIST])
      invalidate([queryKeys.GET_PUBLICATION, documentId])
      invalidate([queryKeys.PUBLICATION_CHANGES, documentId])
      invalidate([queryKeys.ENTITY_TIMELINE, documentId])
      invalidate([queryKeys.PUBLICATION_CITATIONS])
      if (draftGroupContext) {
        invalidate([queryKeys.GET_GROUP, draftGroupContext.groupId])
        invalidate([queryKeys.GET_GROUP_CONTENT, draftGroupContext.groupId])
        invalidate([queryKeys.GET_GROUPS_FOR_DOCUMENT, documentId])
      }

      setTimeout(() => {
        client.removeQueries([queryKeys.EDITOR_DRAFT, result.pub.document?.id])
        client.removeQueries({queryKey: [queryKeys.EDITOR_DRAFT, documentId]})
        client.removeQueries({
          queryKey: [
            queryKeys.EDITOR_DRAFT_CONTENT,
            queryKeys.EDITOR_DRAFT,
            documentId,
          ],
        })
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
  updatedAt: any
}

export function useDraftTitle(
  input: UseQueryOptions<EditorDraftState> & {documentId?: string | undefined},
) {
  const draft = useDraft({documentId: input.documentId})
  return draft.data?.title || undefined
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

export function useDraft({
  documentId,
  ...options
}: UseQueryOptions<Document | null> & {
  documentId?: string
}) {
  const grpcClient = useGRPCClient()
  const diagnosis = useDraftDiagnosis()
  return useQuery(queryDraft({documentId, grpcClient, diagnosis, ...options}))
}

export function queryDraft({
  documentId,
  grpcClient,
  diagnosis,
  ...options
}: {
  documentId?: string
  grpcClient: GRPCClient
  diagnosis?: ReturnType<typeof useDraftDiagnosis>
} & UseQueryOptions<Document | null>): UseQueryOptions<Document | null> {
  return {
    enabled: !!documentId,
    queryKey: [queryKeys.EDITOR_DRAFT, documentId],
    refetchOnMount: false,
    retry: false,
    useErrorBoundary: false,
    queryFn: async () => {
      try {
        let serverDraft = await grpcClient.drafts.getDraft({
          documentId,
        })

        diagnosis?.append(documentId!, {
          key: 'getDraft',
          value: hmDocument(serverDraft),
        })

        return serverDraft
      } catch (error) {
        diagnosis?.append(documentId!, {
          key: 'getDraftError',
          value: JSON.stringify(error),
        })

        return null
      }
    },
    ...options,
  }
}

/**
 *
 * Draft Machine logic
 *
 * - initialize machine with all the context data:
 *    - draft: Document
 *    -
 * - fetch draft
 *    - Error: show draft error (maybe retry or do extra checks before showing the error)
 *    - OK:
 */

export function useDraftEditor({
  documentId,
  route,
}: {
  documentId?: string
  route: NavRoute
}) {
  const grpcClient = useGRPCClient()
  const openUrl = useOpenUrl()
  const replace = useNavigate('replace')
  const queryClient = useAppContext().queryClient
  const {invalidate, client} = queryClient
  const diagnosis = useDraftDiagnosis()
  const [writeEditorStream, editorStream] = useRef(
    writeableStateStream<any>(null),
  ).current

  // fetch draft
  const backendDraft = useDraft({
    documentId,
    useErrorBoundary: false,
    onError: (error) => {
      console.log('=======================')
      send({type: 'GET.DRAFT.ERROR', error})
    },
    retry: false,
  })

  console.log(`== ~ backendDraft:`, backendDraft)

  const draftStatusActor = DraftStatusContext.useActorRef()

  const [state, send, actor] = useMachine(
    draftMachine.provide({
      actions: {
        populateEditor: ({event}) => {
          if (
            event.type == 'GET.DRAFT.SUCCESS' &&
            event.draft.children.length
          ) {
            let editorBlocks = toHMBlock(event.draft.children)
            const tiptap = editor?._tiptapEditor
            editor.replaceBlocks(editor.topLevelBlocks, editorBlocks)
            // this is a hack to set the current blockGroups in the editor to the correct type, because from the BN API we don't have access to those nodes.
            setGroupTypes(tiptap, editorBlocks)
          }
        },
        focusEditor: () => {
          const tiptap = editor?._tiptapEditor
          if (tiptap && !tiptap.isFocused) {
            editor._tiptapEditor.commands.focus()
          }
        },
        onSaveSuccess: ({event}) => {
          // because this action is called as a result of a promised actor, that's why there are errors and is not well typed
          // @ts-expect-error
          if (event.output) {
            invalidate([queryKeys.GET_DRAFT_LIST])
            invalidate([queryKeys.EDITOR_DRAFT, documentId])
          }
        },
        indicatorChange: () =>
          draftStatusActor.send({type: 'INDICATOR.CHANGE'}),
        indicatorSaving: () =>
          draftStatusActor.send({type: 'INDICATOR.SAVING'}),
        indicatorSaved: () => draftStatusActor.send({type: 'INDICATOR.SAVED'}),
        indicatorError: () => draftStatusActor.send({type: 'INDICATOR.ERROR'}),
        resetDraftAndRedirectToDraftList: () => {
          grpcClient.drafts.deleteDraft({documentId}).then(() => {
            replace({key: 'drafts'})
          })
        },
      },
      actors: {
        updateDraft: fromPromise<
          UpdateDraftResponse | string,
          ContextFrom<typeof draftMachine>
        >(
          // TODO: I need to convert this to another thing. because I need to check if there are changes before I send any request
          async ({input}) => {
            let currentEditorBlocks = [...editor.topLevelBlocks]
            let {changes, touchedBlocks} = compareBlocksWithMap(
              editor,
              input.blocksMap,
              currentEditorBlocks,
              '',
            )

            let deletedBlocks = extractDeletes(input.blocksMap, touchedBlocks)

            if (input.draft?.title != input.title) {
              changes = [
                new DocumentChange({
                  op: {
                    case: 'setTitle',
                    value: input.title,
                  },
                }),
                ...changes,
              ]
            }

            let capturedChanges = [...changes, ...deletedBlocks]

            if (capturedChanges.length) {
              diagnosis.append(documentId, {
                key: 'will.updateDraft',
                // note: 'regular updateDraft',
                value: changesToJSON(capturedChanges),
              })
              try {
                let mutation = await grpcClient.drafts.updateDraft({
                  documentId,
                  changes: capturedChanges,
                })

                console.log(`== ~ mutation:`, mutation)
                if (mutation.updatedDocument) {
                  console.log('== draft updates', mutation)
                  client.setQueryData(
                    [queryKeys.GET_DRAFT, documentId],
                    mutation.updatedDocument,
                  )
                }

                diagnosis.append(documentId, {
                  key: 'did.updateDraft',
                  // note: 'regular updateDraft',
                  value: JSON.stringify(mutation),
                })

                return mutation
              } catch (error) {
                return Promise.reject(JSON.stringify(error))
              }
            }

            return Promise.resolve(
              'No changes applied. Reaching this should be impossible!',
            )
          },
        ),
      },
    }),
  )

  // create editor
  const editor = useBlockNote<typeof hmBlockSchema>({
    onEditorContentChange(editor: BlockNoteEditor<typeof hmBlockSchema>) {
      writeEditorStream(editor.topLevelBlocks)
      send({type: 'CHANGE'})

      function observeBlocks(
        blocks: EditorBlock<typeof hmBlockSchema>[],
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

          if (block.children) {
            observeBlocks(block.children, block.id)
          }
        })
      }
      observeBlocks(editor.topLevelBlocks, '')
    },
    linkExtensionOptions: {
      openOnClick: false,
      queryClient,
      openUrl,
    },

    // onEditorReady: (e) => {
    //   readyThings.current[0] = e
    //   handleMaybeReady()
    // },
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

  useEffect(() => {
    if (state.matches('fetching')) {
      if (backendDraft.status == 'success') {
        send({type: 'GET.DRAFT.SUCCESS', draft: backendDraft.data})
      } else if (backendDraft.status == 'error') {
        send({type: 'GET.DRAFT.ERROR', error: backendDraft.error})
      }
    }
    /* eslint-disable */
  }, [backendDraft.status])

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

  return {
    state,
    send,
    actor,
    draft: backendDraft.data,
    editor,
    editorStream,
    draftStatusActor,
    handleDrop: (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      let file: File | null =
        event.dataTransfer.items?.[0]?.getAsFile() ||
        event.dataTransfer.files?.[0] ||
        null
      if (!file) return
      handleDragReplace(file).then((props) => {
        if (chromiumSupportedImageMimeTypes.has(file.type)) {
          editor?._tiptapEditor.commands.insertContent({
            type: 'image',
            id: generateBlockId(),
            attrs: props,
            text: '',
          })
          // todo: support video type
        } else {
          editor?._tiptapEditor.commands.insertContent({
            type: 'file',
            id: generateBlockId(),
            attrs: props,
            text: '',
          })
        }
      })
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
        // @ts-expect-error
        block.props &&
        // @ts-expect-error
        block.props.childrenType
      ) {
        node.descendants((child: Node, childPos: number) => {
          if (child.type.name === 'blockGroup') {
            setTimeout(() => {
              let tr = tiptap.state.tr
              // @ts-expect-error
              tr = block.props?.start
                ? tr.setNodeMarkup(pos + childPos + 1, null, {
                    // @ts-expect-error
                    listType: block.props?.childrenType,
                    // @ts-expect-error
                    start: parseInt(block.props?.start),
                  })
                : tr.setNodeMarkup(pos + childPos + 1, null, {
                    // @ts-expect-error
                    listType: block.props?.childrenType,
                  })
              tiptap.view.dispatch(tr)
            })
            return false
          }
        })
      }
    })
    // @ts-expect-error
    if (block.children) {
      // @ts-expect-error
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

export type BlocksMap = Record<string, BlocksMapIten>

export type BlocksMapIten = {
  parent: string
  left: string
  block: Block
}

export function createBlocksMap(
  blockNodes: Array<BlockNode>,
  parentId: string,
) {
  let result: BlocksMap = {}

  blockNodes.forEach((bn, idx) => {
    if (bn.block?.id) {
      let prevBlockNode = idx > 0 ? blockNodes[idx - 1] : undefined

      result[bn.block.id] = {
        parent: parentId,
        left:
          prevBlockNode && prevBlockNode.block ? prevBlockNode.block.id : '',
        block: bn.block,
      }

      if (bn.children.length) {
        // recursively call the block children and append to the result
        result = {...result, ...createBlocksMap(bn.children, bn.block.id)}
      }
    }
  })

  return result
}

export function compareBlocksWithMap(
  editor: BlockNoteEditor,
  blocksMap: BlocksMap,
  blocks: Array<EditorBlock>,
  parentId: string,
) {
  let changes: Array<DocumentChange> = []
  let touchedBlocks: Array<string> = []

  // iterate over editor blocks
  blocks.forEach((block, idx) => {
    // add blockid to the touchedBlocks list to capture deletes later
    touchedBlocks.push(block.id)

    // compare replace
    let prevBlockState = blocksMap[block.id]

    const childGroup = getBlockGroup(block.id)

    if (childGroup) {
      // @ts-expect-error
      block.props.childrenType = childGroup.type ? childGroup.type : 'group'
      // @ts-expect-error
      if (childGroup.start) block.props.start = childGroup.start.toString()
    }
    let currentBlockState = fromHMBlock(block)

    if (!prevBlockState) {
      const serverBlock = fromHMBlock(block)

      // add moveBlock change by default to all blocks
      changes.push(
        new DocumentChange({
          op: {
            case: 'moveBlock',
            value: {
              blockId: block.id,
              leftSibling: idx > 0 && blocks[idx - 1] ? blocks[idx - 1].id : '',
              parent: parentId,
            },
          },
        }),
        new DocumentChange({
          op: {
            case: 'replaceBlock',
            value: serverBlock,
          },
        }),
      )
    } else {
      let left = idx > 0 && blocks[idx - 1] ? blocks[idx - 1].id : ''
      if (prevBlockState.left !== left || prevBlockState.parent !== parentId) {
        changes.push(
          new DocumentChange({
            op: {
              case: 'moveBlock',
              value: {
                blockId: block.id,
                leftSibling: left,
                parent: parentId,
              },
            },
          }),
        )
      }

      if (!isBlocksEqual(prevBlockState.block, currentBlockState)) {
        // this means is a new block and we need to also add a replaceBlock change
        changes.push(
          new DocumentChange({
            op: {
              case: 'replaceBlock',
              value: currentBlockState,
            },
          }),
        )
      }
    }

    if (block.children.length) {
      let nestedResults = compareBlocksWithMap(
        editor,
        blocksMap,
        block.children,
        block.id,
      )
      changes = [...changes, ...nestedResults.changes]
      touchedBlocks = [...touchedBlocks, ...nestedResults.touchedBlocks]
    }
  })

  function getBlockGroup(blockId: BlockIdentifier) {
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

  return {
    changes,
    touchedBlocks,
  }
}

export function extractDeletes(
  blocksMap: BlocksMap,
  touchedBlocks: Array<string>,
) {
  let deletedIds = Object.keys(blocksMap).filter(
    (id) => !touchedBlocks.includes(id),
  )

  return deletedIds.map(
    (dId) =>
      new DocumentChange({
        op: {
          case: 'deleteBlock',
          value: dId,
        },
      }),
  )
}

export function isBlocksEqual(b1: Block, b2: Block): boolean {
  let result =
    // b1.id == b2.id &&
    b1.text == b2.text &&
    b1.ref == b2.ref &&
    _.isEqual(b1.annotations, b2.annotations) &&
    // TODO: how to correctly compare attributes???
    isBlockAttributesEqual(b1, b2) &&
    b1.type == b2.type
  return result
}

function isBlockAttributesEqual(b1: Block, b2: Block): boolean {
  let a1 = b1.attributes
  let a2 = b2.attributes

  return (
    a1.childrenType == a2.childrenType &&
    a1.start == a2.start &&
    a1.level == a2.level &&
    a1.url == a2.url &&
    a1.size == a2.size &&
    a1.ref == a2.ref &&
    a1.language == a2.language
  )
}
