import {useAppContext, useGRPCClient, useQueryInvalidator} from '@/app-context'
import {createHypermediaDocLinkPlugin} from '@/editor'
import {useAccounts, useMyAccount_deprecated} from '@/models/accounts'
import {queryKeys} from '@/models/query-keys'
import {useOpenUrl} from '@/open-url'
import {slashMenuItems} from '@/slash-menu-items'
import {trpc} from '@/trpc'
import {Timestamp, toPlainMessage} from '@bufbuild/protobuf'
import {
  Document,
  DocumentChange,
  GRPCClient,
  HMAccount,
  HMBlock,
  HMBlockNode,
  HMDocument,
  HMDraft,
  UnpackedHypermediaId,
  fromHMBlock,
  hmDocument,
  unpackDocId,
  unpackHmId,
  writeableStateStream,
} from '@shm/shared'
import {
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
} from '@tanstack/react-query'
import {Extension, findParentNode} from '@tiptap/core'
import {NodeSelection} from '@tiptap/pm/state'
import {useMachine} from '@xstate/react'
import _ from 'lodash'
import {nanoid} from 'nanoid'
import {useEffect, useMemo, useRef, useState} from 'react'
import {ContextFrom, fromPromise} from 'xstate'
import {
  BlockNoteEditor,
  Block as EditorBlock,
  hmBlockSchema,
  useBlockNote,
} from '../editor'
import {useNavRoute} from '../utils/navigation'
import {pathNameify} from '../utils/path'
import {NavRoute} from '../utils/routes'
import {useNavigate} from '../utils/useNavigate'
import {DraftStatusContext, draftMachine} from './draft-machine'
import {getBlockGroup, setGroupTypes} from './editor-utils'
import {useGatewayUrl, useGatewayUrlStream} from './gateway-settings'
import {useInlineMentions} from './search'

export function useDocumentList(
  opts?: UseInfiniteQueryOptions<{
    nextPageToken: string
    documents: HMDocument
  }> & {},
) {
  const {...queryOpts} = opts || {}
  const grpcClient = useGRPCClient()
  const pubListQuery = useInfiniteQuery({
    ...queryOpts,
    queryKey: [queryKeys.DOCUMENT_LIST],
    refetchOnMount: true,
    queryFn: async (context) => {
      const result = await grpcClient.documents.listDocuments({
        pageSize: 50,
        pageToken: context.pageParam,
      })
      const documents = result.documents.map(toPlainMessage) || []
      return {
        nextPageToken: result.nextPageToken,
        documents,
      }
    },
    getNextPageParam: (lastPage) => {
      return lastPage.nextPageToken
    },
  })

  const allDocuments =
    pubListQuery.data?.pages.flatMap((page) => page.documents) || []
  return {
    ...pubListQuery,
    data: {
      ...pubListQuery.data,
      documents: allDocuments,
    },
  }
}

export function useDraftList() {
  // opts: UseQueryOptions<unknown, unknown, HMDocument[]> = {},
  return trpc.drafts.list.useQuery(undefined, {})
}

export function useDeleteDraft(
  opts: UseMutationOptions<void, unknown, string>,
) {
  const {queryClient} = useAppContext()
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation({
    ...opts,
    mutationFn: async (draftId) => {
      await grpcClient.drafts.deleteDraft({draftId})
    },
    onSuccess: (response, documentId, context) => {
      setTimeout(() => {
        invalidate([queryKeys.GET_DRAFT_LIST])
        invalidate([queryKeys.DOCUMENT_DRAFTS, documentId])
        invalidate([queryKeys.ENTITY_TIMELINE, documentId])
        invalidate([queryKeys.EDITOR_DRAFT, documentId])
        queryClient.client.removeQueries([queryKeys.EDITOR_DRAFT, documentId])
      }, 200)
      opts?.onSuccess?.(response, documentId, context)
    },
  })
}

type ListedEmbed = {
  blockId: string
  ref: string
  refId: UnpackedHypermediaId
}

function extractRefs(
  children: HMBlockNode[],
  skipCards?: boolean,
): ListedEmbed[] {
  let refs: ListedEmbed[] = []
  function extractRefsFromBlock(block: HMBlockNode) {
    if (block.block?.type === 'embed' && block.block.ref) {
      if (block.block.attributes?.view === 'card' && skipCards) return
      const refId = unpackHmId(block.block.ref)
      if (refId)
        refs.push({
          blockId: block.block.id,
          ref: block.block.ref,
          refId,
        })
    }
    if (block.children) {
      block.children.forEach(extractRefsFromBlock)
    }
  }
  children.forEach(extractRefsFromBlock)
  // console.log('extractRefs', children, refs)
  return refs
}

export type EmbedsContent = Record<
  string,
  | {
      type: 'd'
      data: HMDocument
      query: {refId: UnpackedHypermediaId; blockId: string}
    }
  | {
      type: 'a'
      data: HMAccount
      query: {refId: UnpackedHypermediaId; blockId: string}
    }
  | undefined
>

export function useDocumentDrafts(docId: string | undefined) {
  const grpcClient = useGRPCClient()
  const drafts = useQuery({
    queryKey: [queryKeys.DOCUMENT_DRAFTS, docId],
    enabled: !!docId,
    queryFn: async () => {
      const result = await grpcClient.drafts.listDocumentDrafts({
        documentId: docId,
      })
      const drafts = (
        await Promise.all(
          result.drafts.map((draft) =>
            grpcClient.drafts.getDraft({draftId: draft.id}),
          ),
        )
      ).map(toPlainMessage)
      return drafts
    },
  })
  return drafts
}

export function useDocumentEmbeds(
  doc: HMDocument | undefined | null,
  enabled?: boolean,
  opts?: {skipCards: boolean},
): EmbedsContent {
  // todo: query for comments here as well
  const {queryDocuments, queryAccounts} = useMemo(() => {
    if (!enabled) return {queryDocuments: [], queryAccounts: []}
    const queryDocuments: {
      blockId: string
      refId: UnpackedHypermediaId
    }[] = []
    const queryAccounts: {blockId: string; refId: UnpackedHypermediaId}[] = []
    extractRefs(doc?.content || [], opts?.skipCards).forEach(
      ({refId, blockId}) => {
        if (refId.type === 'a') {
          queryAccounts.push({blockId, refId})
        } else if (refId.type === 'd') {
          queryDocuments.push({blockId, refId})
        }
      },
    )
    return {
      queryDocuments,
      queryAccounts,
    }
  }, [doc, enabled])
  const docs = useDocuments(
    queryDocuments.map((q) => ({
      docId: q.refId.qid,
      version: q.refId.version || undefined,
    })),
  )
  const accounts = useAccounts(queryAccounts.map((q) => q.refId.eid))
  const embeds = Object.fromEntries([
    ...docs.map((doc, idx) => [
      queryDocuments[idx].blockId,
      {type: 'd', query: queryDocuments[idx], data: doc.data},
    ]),
    ...accounts.map((account, idx) => [
      queryAccounts[idx].blockId,
      {type: 'a', query: queryAccounts[idx], data: account.data},
    ]),
  ]) as EmbedsContent
  return embeds
}

// TODO: Duplicate (apps/site/server/routers/_app.ts#~187)
export function sortDocuments(a?: Timestamp, b?: Timestamp) {
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
    {
      pub: Document
      isFirstPublish: boolean
      isProfileDocument: boolean
    },
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
  const myAccount = useMyAccount_deprecated()
  const isProfileDocument = false

  const {client, invalidate} = queryClient
  const diagnosis = useDraftDiagnosis()
  return useMutation({
    ...opts,
    mutationFn: async ({
      draftId,
    }: {
      draftId: string
    }): Promise<{
      pub: Document
      isFirstPublish: boolean
      isProfileDocument: boolean
    }> => {
      const branch = toPlainMessage(
        await grpcClient.drafts.publishDraft({draftId}),
      )
      await diagnosis.complete(draftId, {
        key: 'did.publishDraft',
        value: branch,
      })
      const isFirstPublish = await markDocPublish.mutateAsync(draftId)
      const publishedId = branch.documentId
      if (!publishedId)
        throw new Error('Could not get ID of published document')
      if (isProfileDocument) {
        if (myAccount.data?.profile?.rootDocument !== publishedId) {
          await grpcClient.accounts.updateProfile({
            ...myAccount.data?.profile,
            rootDocument: publishedId,
          })
        }
      }
      return {isFirstPublish, pub, isProfileDocument}
    },
    onSuccess: (result, variables, context) => {
      const documentId = result.pub.document?.id
      opts?.onSuccess?.(result, variables, context)
      invalidate([queryKeys.FEED_LATEST_EVENT])
      invalidate([queryKeys.RESOURCE_FEED_LATEST_EVENT])
      invalidate([queryKeys.DOCUMENT_LIST])
      invalidate([queryKeys.GET_DRAFT_LIST])
      invalidate([queryKeys.DOCUMENT_DRAFTS, documentId])
      invalidate([queryKeys.DOCUMENT, documentId])
      invalidate([queryKeys.ENTITY_TIMELINE, documentId])
      invalidate([queryKeys.ALL_ACCOUNTS]) // accounts invalidate because profile doc may be updated
      invalidate([queryKeys.ACCOUNT, myAccount.data?.id])
      invalidate([queryKeys.ENTITY_CITATIONS])
      setTimeout(() => {
        client.removeQueries([queryKeys.EDITOR_DRAFT, documentId])
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
  const draft = useDraft({draftId: input.documentId})
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
  draftId = '',
  ...options
}: UseQueryOptions<any | null> & {
  draftId?: string
}) {
  return trpc.drafts.get.useQuery(draftId, {
    enabled: !!draftId,
  })
}

export function useDrafts(
  ids: string[],
  options?: UseQueryOptions<HMDocument | null>,
) {
  // return useQueries({
  //   queries: ids.map((draftId) => trpc.drafts.get.useQuery(draftId, {
  //     enabled: !!draftId,
  //     queryKey: [queryKeys.EDITOR_DRAFT, draftId],
  //   }),
  //   ...(options || {}),
  // })
  // TODO: IMPLEMENT ME
}

export function queryDraft({
  draftId,
  diagnosis,
  ...options
}: {
  draftId?: string
  diagnosis?: ReturnType<typeof useDraftDiagnosis>
} & UseQueryOptions<HMDocument | null>): UseQueryOptions<HMDocument | null> {
  return {
    enabled: !!draftId,
    queryKey: [queryKeys.EDITOR_DRAFT, draftId],
    useErrorBoundary: false,
    queryFn: async () => {
      try {
        let serverDraft = null
        // const doc = serverDraft
        const doc = serverDraft ? hmDocument(serverDraft) : null

        diagnosis?.append(draftId!, {
          key: 'getDraft',
          value: doc,
        })

        return doc
      } catch (error) {
        diagnosis?.append(draftId!, {
          key: 'getDraftError',
          value: JSON.stringify(error),
        })
        return null
      }
    },
    ...options,
  }
}

export function useDraftEditor({id}: {id: string}) {
  const {queryClient, grpcClient} = useAppContext()
  const openUrl = useOpenUrl()
  const route = useNavRoute()
  const replaceRoute = useNavigate('replace')
  const gwUrl = useGatewayUrlStream()
  const checkWebUrl = trpc.webImporting.checkWebUrl.useMutation()
  const gotEdited = useRef(false)
  const showNostr = trpc.experiments.get.useQuery().data?.nostr
  const [writeEditorStream, editorStream] = useRef(
    writeableStateStream<any>(null),
  ).current
  const saveDraft = trpc.drafts.write.useMutation()

  const editor = useBlockNote<typeof hmBlockSchema>({
    onEditorContentChange(editor: BlockNoteEditor<typeof hmBlockSchema>) {
      if (!gotEdited.current) {
        gotEdited.current = true
      }

      writeEditorStream(editor.topLevelBlocks)
      observeBlocks(
        editor,
        editor.topLevelBlocks,
        () => {},
        // send({type: 'CHANGE'}),
      )
      send({type: 'CHANGE'})
    },
    onTextCursorPositionChange(editor: BlockNoteEditor<typeof hmBlockSchema>) {
      const {view} = editor._tiptapEditor
      const {selection} = view.state
      if (
        selection.from !== selection.to &&
        !(selection instanceof NodeSelection)
      )
        return
      const domAtPos = view.domAtPos(selection.from)
      try {
        const rect: DOMRect = domAtPos.node.getBoundingClientRect()
        // Check if the cursor is off screen
        if ((rect && rect.top < 0) || rect.bottom > window.innerHeight) {
          // Scroll the cursor into view
          domAtPos.node.scrollIntoView({block: 'center'})
        }
      } catch {}
      return
    },

    linkExtensionOptions: {
      openOnClick: false,
      queryClient,
      grpcClient,
      gwUrl,
      openUrl,
      checkWebUrl: checkWebUrl.mutate,
    },
    onMentionsQuery: (query: string) => {
      // inlineMentionsQuery(query)
    },
    blockSchema: hmBlockSchema,
    slashMenuItems: !showNostr
      ? slashMenuItems.filter((item) => item.name != 'Nostr')
      : slashMenuItems,
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

  const [state, send, actor] = useMachine(
    draftMachine.provide({
      actions: {
        populateEditor: function ({context, event}) {
          if (context.draft != null && context.draft.content.length != 0) {
            editor.replaceBlocks(editor.topLevelBlocks, context.draft.content)
            const tiptap = editor?._tiptapEditor
            // this is a hack to set the current blockGroups in the editor to the correct type, because from the BN API we don't have access to those nodes.
            setGroupTypes(tiptap, context.draft.content)
          }
        },
        focusEditor: () => {
          const tiptap = editor?._tiptapEditor
          if (tiptap && !tiptap.isFocused) {
            editor._tiptapEditor.commands.focus()
          }
        },
        replaceRouteifNeeded: ({event}) => {
          const output = event.output
          if (!id) {
            replaceRoute({...route, id: output.id})
          }
        },
      },
      actors: {
        createOrUpdateDraft: fromPromise<
          HMDraft,
          ContextFrom<typeof draftMachine>
        >(({input}) => {
          const blocks = editor.topLevelBlocks
          let inputData: Partial<HMDraft> = {}
          const draftId = id || nanoid()
          if (!input.draft) {
            inputData = {
              content: blocks,
              deps: [],
              metadata: {
                title: input.title,
              },
              members: {},
              index: {},
            }
          } else {
            inputData = {
              ...input.draft,
              content: blocks,
              metadata: {
                ...input.draft.metadata,
                title: input.title,
              },
            }
          }

          return saveDraft.mutateAsync({id: draftId, draft: inputData})
        }),
      },
    }),
  )

  console.log(`== ~ useDraftEditor ~ state:`, state)

  const backendDraft = useDraft({draftId: id})

  useEffect(() => {
    // if (backendDraft.status == 'loading' && !id) {
    //   send({type: 'EMPTY.ID'})
    // }
    // if (state.matches('idle')) {
    if (backendDraft.status == 'success') {
      console.log('=== SUCCESS', backendDraft)
      send({type: 'GET.DRAFT.SUCCESS', draft: backendDraft.data})
    }
    if (backendDraft.status == 'error') {
      console.log('=== ERROR', backendDraft)
      send({type: 'GET.DRAFT.ERROR', error: backendDraft.error})
    }
    // }
  }, [backendDraft])

  useEffect(() => {
    function handleSelectAll(event: KeyboardEvent) {
      if (event.key == 'a' && event.metaKey) {
        if (editor) {
          event.preventDefault()
          editor._tiptapEditor.commands.focus()
          editor._tiptapEditor.commands.selectAll()
        }
      }
    }

    window.addEventListener('keydown', handleSelectAll)

    return () => {
      window.removeEventListener('keydown', handleSelectAll)
    }
  }, [])

  return {editor, handleFocusAtMousePos, state, send, actor}

  // ==============

  function handleFocusAtMousePos(event: MouseEvent) {
    let ttEditor = (editor as BlockNoteEditor)._tiptapEditor
    let editorView = ttEditor.view
    let editorRect = editorView.dom.getBoundingClientRect()
    let centerEditor = editorRect.left + editorRect.width / 2

    const pos = editorView.posAtCoords({
      left: editorRect.left + 1,
      top: event.clientY + editorView.dom.offsetTop,
    })

    if (pos) {
      let node = editorView.state.doc.nodeAt(pos.pos)

      let sel = Selection.near(
        editorView.state.doc.resolve(
          event.clientX < centerEditor ? pos.pos : pos.pos + node.nodeSize - 1,
        ),
      )

      ttEditor.commands.focus()
      ttEditor.commands.setTextSelection(sel)
    } else {
      if (event.clientY > editorRect.top) {
        // this is needed because if the user clicks on one of the sides of the title we don't want to jump to the bottom of the document to focus the document.
        // if the window is scrolled and the title is not visible this will not matter because a block will be at its place so the normal focus should work.
        ttEditor.commands.focus()
        ttEditor.commands.setTextSelection(ttEditor.state.doc.nodeSize)
      }
    }
  }
}

export function _useDraftEditor({
  draftId,
  route,
  checkWebUrl,
}: {
  draftId?: string
  route: NavRoute
  checkWebUrl: any
}) {
  const grpcClient = useGRPCClient()
  const openUrl = useOpenUrl()
  const replace = useNavigate('replace')
  const queryClient = useAppContext().queryClient
  const {invalidate, client} = queryClient
  const diagnosis = useDraftDiagnosis()
  const gotEdited = useRef(false)
  const create = trpc.drafts.write.useMutation()
  const {inlineMentionsData, inlineMentionsQuery} = useInlineMentions()
  const [writeEditorStream, editorStream] = useRef(
    writeableStateStream<any>(null),
  ).current
  const showNostr = trpc.experiments.get.useQuery().data?.nostr

  // fetch draft
  const backendDraft = useDraft({
    enabled: !!draftId,
    draftId: draftId,
    onError: (error) => {
      send({type: 'GET.DRAFT.ERROR', error})
    },
  })

  console.log(`== ~ backendDraft:`, backendDraft, route)

  const draftStatusActor = DraftStatusContext.useActorRef()

  // const [state, send, actor] = useMachine(
  //   draftMachine.provide({
  //     actions: {
  //       populateEditor: function ({context, event}, params) {
  //         console.log('=== POPULATE EDITOR')
  //         if (
  //           event.type == 'GET.DRAFT.SUCCESS' &&
  //           event.draft.content?.length
  //         ) {
  //           let editorBlocks = toHMBlock(
  //             event.draft.content as Array<HMBlockNode>,
  //           )

  //           // editor.removeBlocks(editor.topLevelBlocks)
  //           editor.replaceBlocks(editor.topLevelBlocks, editorBlocks)
  //           const tiptap = editor?._tiptapEditor
  //           // this is a hack to set the current blockGroups in the editor to the correct type, because from the BN API we don't have access to those nodes.
  //           setGroupTypes(tiptap, editorBlocks)
  //         } else {
  //           console.log('== the draft is empty!')
  //         }
  //       },
  //       focusEditor: () => {
  //         const tiptap = editor?._tiptapEditor
  //         if (tiptap && !tiptap.isFocused) {
  //           editor._tiptapEditor.commands.focus()
  //         }
  //       },
  //       onSaveSuccess: ({event}) => {
  //         // because this action is called as a result of a promised actor, that's why there are errors and is not well typed
  //         // @ts-expect-error
  //         if (event.output) {
  //           invalidate([queryKeys.GET_DRAFT_LIST])
  //           invalidate([queryKeys.DOCUMENT_DRAFTS, draftId])
  //           invalidate([queryKeys.EDITOR_DRAFT, draftId])
  //         }
  //       },
  //       indicatorChange: () =>
  //         draftStatusActor.send({type: 'INDICATOR.CHANGE'}),
  //       indicatorSaving: () =>
  //         draftStatusActor.send({type: 'INDICATOR.SAVING'}),
  //       indicatorSaved: () => draftStatusActor.send({type: 'INDICATOR.SAVED'}),
  //       indicatorError: () => draftStatusActor.send({type: 'INDICATOR.ERROR'}),
  //       indicatorIdle: () => draftStatusActor.send({type: 'INDICATOR.IDLE'}),
  //       resetDraftAndRedirectToDraftList: () => {
  //         // TODO: IMPLEMENT ME
  //         replace({key: 'home'})
  //       },
  //     },
  //     actors: {
  //       updateOrCreateDraft: fromPromise<
  //         HMDocument,
  //         ContextFrom<typeof draftMachine>
  //       >(async ({input}) => {
  //         // delay the time we save to the backend to force editor changes.
  //         // await delay(0)

  //         if (input.draft) {
  //           console.log('=== UPDATEDRAFT', input)
  //           return updateDraft({editor, draft: input.draft})
  //         } else {
  //           console.log('=== CREATE DRAFT', input)
  //           const newDraft = await createDraft({
  //             create,
  //             editor,
  //             title: 'Hello Hello',
  //           })

  //           //   const newDraft = await createNewDraft({editor: val})
  //           replace({...route, draftId: newDraft.id} as DraftRoute)
  //           return newDraft
  //         }
  //       }),
  //       restoreDraft: fromPromise<HMDocument, ContextFrom<typeof draftMachine>>(
  //         async ({input}) => {
  //           // TODO: IMPLEMENT ME
  //           return input.draft
  //         },
  //       ),
  //       resetDraft: fromPromise<HMDocument, ContextFrom<typeof draftMachine>>(
  //         async ({input}) => {
  //           // TODO: IMPLEMENT ME
  //           return input.draft
  //         },
  //       ),
  //     },
  //     delays: {
  //       // This is the time the machine waits after the last keystroke event before starting to save.
  //       autosaveTimeout: 500,
  //     },
  //     guards: {
  //       routeHasId: function () {
  //         return !!draftId || typeof backendDraft != 'string'
  //       },
  //     },
  //   }),
  // )

  const gwUrl = useGatewayUrlStream()

  // create editor
  const editor = useBlockNote<typeof hmBlockSchema>({
    onEditorContentChange(editor: BlockNoteEditor<typeof hmBlockSchema>) {
      if (!gotEdited.current) {
        gotEdited.current = true
      }

      writeEditorStream(editor.topLevelBlocks)
      observeBlocks(
        editor,
        editor.topLevelBlocks,
        () => {},
        // send({type: 'CHANGE'}),
      )
      send({type: 'CHANGE'})
    },
    onTextCursorPositionChange(editor: BlockNoteEditor<typeof hmBlockSchema>) {
      const {view} = editor._tiptapEditor
      const {selection} = view.state
      if (
        selection.from !== selection.to &&
        !(selection instanceof NodeSelection)
      )
        return
      const domAtPos = view.domAtPos(selection.from)
      try {
        const rect: DOMRect = domAtPos.node.getBoundingClientRect()
        // Check if the cursor is off screen
        if ((rect && rect.top < 0) || rect.bottom > window.innerHeight) {
          // Scroll the cursor into view
          domAtPos.node.scrollIntoView({block: 'center'})
        }
      } catch {}
      return
    },

    linkExtensionOptions: {
      openOnClick: false,
      queryClient,
      grpcClient,
      gwUrl,
      openUrl,
      checkWebUrl: checkWebUrl.mutate,
    },
    onMentionsQuery: (query: string) => {
      inlineMentionsQuery(query)
    },

    // onEditorReady: (e) => {
    //   readyThings.current[0] = e
    //   handleMaybeReady()
    // },
    blockSchema: hmBlockSchema,
    slashMenuItems: !showNostr
      ? slashMenuItems.filter((item) => item.name != 'Nostr')
      : slashMenuItems,
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

  // useEffect(() => {
  //   if (state.matches('fetching')) {
  //     if (backendDraft.status == 'success' && backendDraft.data) {
  //       send({type: 'GET.DRAFT.SUCCESS', draft: backendDraft.data})
  //     } else if (backendDraft.status == 'error') {
  //       send({type: 'GET.DRAFT.ERROR', error: backendDraft.error})
  //     }
  //   }

  //   return () => {
  //     if (state.matches({ready: 'changed'})) {
  //       updateDraft({
  //         editor,
  //         draft: state.context.draft,
  //       }).then(() => {
  //         invalidate([queryKeys.GET_DRAFT_LIST])
  //         invalidate([queryKeys.DOCUMENT_DRAFTS, draftId])
  //         invalidate([queryKeys.EDITOR_DRAFT, draftId])
  //       })
  //     }
  //   }
  // }, [backendDraft.status])

  // useEffect(() => {
  //   if (inlineMentionsData) {
  //     editor?.setInlineEmbedOptions(inlineMentionsData)
  //   }
  // }, [inlineMentionsData])

  useEffect(() => {
    function handleSelectAll(event: KeyboardEvent) {
      if (event.key == 'a' && event.metaKey) {
        if (editor) {
          event.preventDefault()
          editor._tiptapEditor.commands.focus()
          editor._tiptapEditor.commands.selectAll()
        }
      }
    }

    window.addEventListener('keydown', handleSelectAll)

    return () => {
      window.removeEventListener('keydown', handleSelectAll)
    }
  }, [])

  function handleFocusAtMousePos(event) {
    let ttEditor = (editor as BlockNoteEditor)._tiptapEditor
    let editorView = ttEditor.view
    let editorRect = editorView.dom.getBoundingClientRect()
    let centerEditor = editorRect.left + editorRect.width / 2

    const pos = editorView.posAtCoords({
      left: editorRect.left + 1,
      top: event.clientY + editorView.dom.offsetTop,
    })

    if (pos) {
      let node = editorView.state.doc.nodeAt(pos.pos)

      let sel = Selection.near(
        editorView.state.doc.resolve(
          event.clientX < centerEditor ? pos.pos : pos.pos + node.nodeSize - 1,
        ),
      )

      ttEditor.commands.focus()
      ttEditor.commands.setTextSelection(sel)
    } else {
      if (event.clientY > editorRect.top) {
        // this is needed because if the user clicks on one of the sides of the title we don't want to jump to the bottom of the document to focus the document.
        // if the window is scrolled and the title is not visible this will not matter because a block will be at its place so the normal focus should work.
        ttEditor.commands.focus()
        ttEditor.commands.setTextSelection(ttEditor.state.doc.nodeSize)
      }
    }
  }

  return {
    state,
    send,
    actor,
    draft: backendDraft.data,
    editor,
    editorStream,
    draftStatusActor,
    handleFocusAtMousePos,
  }
}

export type HyperDocsEditor = Exclude<
  ReturnType<typeof useDraftEditor>['editor'],
  null
>

export const findBlock = findParentNode(
  (node) => node.type.name === 'blockContainer',
)

export function useDocTextContent(doc?: HMDocument | null) {
  return useMemo(() => {
    let res = ''
    function extractContent(blocks: Array<HMBlockNode>) {
      blocks.forEach((bn) => {
        if (res.length < 300) {
          res += extractBlockText(bn)
        }
      })

      return res
    }

    function extractBlockText({block, children}: HMBlockNode) {
      let content = ''
      if (!block) return content
      if (block.text) content += block.text

      if (children?.length) {
        let nc = extractContent(children)
        content += nc
      }

      return content
    }

    if (doc?.content?.length) {
      res = extractContent(doc.content)
    }

    return res
  }, [doc])
}

export type BlocksMap = Record<string, BlocksMapItem>

export type BlocksMapItem = {
  parent: string
  left: string
  block: HMBlock
}

export function createBlocksMap(
  blockNodes: Array<HMBlockNode> = [],
  parentId: string,
) {
  let result: BlocksMap = {}
  blockNodes.forEach((bn, idx) => {
    if (bn.block?.id) {
      let prevBlockNode = idx > 0 ? blockNodes[idx - 1] : undefined

      if (bn.block) {
        result[bn.block.id] = {
          parent: parentId,
          left:
            prevBlockNode && prevBlockNode.block ? prevBlockNode.block.id : '',
          block: bn.block,
        }
      }

      if (bn.children?.length) {
        // recursively call the block children and append to the result
        result = {...result, ...createBlocksMap(bn.children, bn.block.id)}
      }
    }
  })

  return result
}

export function usePushPublication() {
  const gatewayUrl = useGatewayUrl()
  const grpcClient = useGRPCClient()
  return useMutation({
    mutationFn: async (docId: string) => {
      if (!gatewayUrl.data) throw new Error('Cannot determine Gateway URL')
      await grpcClient.documents.pushDocument({
        documentId: docId,
        url: gatewayUrl.data,
      })
    },
  })
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

    const childGroup = getBlockGroup(editor, block.id)

    if (childGroup) {
      // @ts-expect-error
      block.props.childrenType = childGroup.type ? childGroup.type : 'group'
      // @ts-expect-error
      block.props.listLevel = childGroup.listLevel
      // @ts-expect-error
      if (childGroup.start) block.props.start = childGroup.start.toString()
    }
    let currentBlockState = fromHMBlock(block)

    if (
      !prevBlockState ||
      prevBlockState.block.attributes?.listLevel !==
        currentBlockState.attributes.listLevel
    ) {
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

  return {
    changes,
    touchedBlocks,
  }
}

export function compareDraftWithMap(
  blocksMap: BlocksMap,
  blockNodes: HMBlockNode[],
  parentId: string,
) {
  let changes: Array<DocumentChange> = []
  let touchedBlocks: Array<string> = []

  // iterate over editor blocks
  blockNodes.forEach((bn, idx) => {
    if (bn.block) {
      // add blockid to the touchedBlocks list to capture deletes later
      touchedBlocks.push(bn.block.id)

      // compare replace
      let prevBlockState = blocksMap[bn.block.id]

      // TODO: get block group

      let currentBlockState = bn.block

      if (!prevBlockState) {
        const serverBlock = currentBlockState

        // add moveBlock change by default to all blocks
        changes.push(
          new DocumentChange({
            op: {
              case: 'moveBlock',
              value: {
                blockId: bn.block.id,
                leftSibling:
                  idx > 0 && blockNodes[idx - 1]
                    ? blockNodes[idx - 1].block!.id
                    : '',
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
        let left =
          idx > 0 && blockNodes[idx - 1] ? blockNodes[idx - 1].block!.id : ''
        if (
          prevBlockState.left !== left ||
          prevBlockState.parent !== parentId
        ) {
          changes.push(
            new DocumentChange({
              op: {
                case: 'moveBlock',
                value: {
                  blockId: bn.block.id,
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

      if (bn.children?.length) {
        let nestedResults = compareDraftWithMap(
          blocksMap,
          bn.children,
          bn.block.id,
        )
        changes = [...changes, ...nestedResults.changes]
        touchedBlocks = [...touchedBlocks, ...nestedResults.touchedBlocks]
      }
    }
  })

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

export function isBlocksEqual(b1: HMBlock, b2: HMBlock): boolean {
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

function isBlockAttributesEqual(b1: HMBlock, b2: HMBlock): boolean {
  let a1 = b1.attributes
  let a2 = b2.attributes
  if (!a1 && !a2) return true
  if (!a1 || !a2) return false
  return (
    a1.childrenType == a2.childrenType &&
    a1.start == a2.start &&
    a1.level == a2.level &&
    a1.url == a2.url &&
    a1.size == a2.size &&
    a1.ref == a2.ref &&
    a1.language == a2.language &&
    a1.view == a2.view &&
    a1.width == a2.width
  )
}

function observeBlocks(
  editor: BlockNoteEditor,
  blocks: Array<EditorBlock<typeof hmBlockSchema>>,
  onChange: () => void,
) {
  blocks.forEach((block, index) => {
    if (block.type == 'imagePlaceholder' && block.props.src) {
      editor.updateBlock(block, {
        type: 'image',
        props: {
          src: block.props.src,
          name: block.props.name,
        },
      })
      onChange()
    }

    if (block.children) {
      observeBlocks(editor, block.children, onChange)
    }

    // TODO: this code was making impossible to remove a paragraph above a media element when it was nested. This was in place because it was also impossible to add a selection above a media element when this media element was the last one in the draft. Now it seems to both cases be fixed when this code is removed. 🤷‍♂️
    // if (
    //   index === blocks.length - 1 &&
    //   ['image', 'video', 'file', 'embed'].includes(block.type)
    // ) {
    //   editor.insertBlocks(
    //     [
    //       {
    //         type: 'paragraph',
    //       },
    //     ],
    //     block.id,
    //     'after',
    //   )
    //   if (editor.getTextCursorPosition().nextBlock) {
    //     editor.setTextCursorPosition(editor.getTextCursorPosition().nextBlock)
    //   }
    // }
  })
}

export function useAccountDocuments(accountId?: string | undefined) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.ACCOUNT_DOCUMENTS, accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const result = await grpcClient.documents.listAccountDocuments({
        accountId,
      })
      const documents =
        result.documents
          .map((doc) => hmDocument(doc))
          .filter((d) => !!d)
          .sort((a, b) => {
            const aTime = a?.updateTime ? new Date(a.updateTime) : 0
            const bTime = b?.updateTime ? new Date(b.updateTime) : 0
            if (!aTime || !bTime) return 0
            return bTime.getTime() - aTime.getTime()
          }) || []
      return {
        documents,
      }
    },
  })
}

export function useDraftRebase({
  shouldCheck,
  draft,
}: {
  shouldCheck: boolean
  draft: HMDocument | null | undefined
}) {
  const grpcClient = useGRPCClient()
  const [rebase, setRebase] = useState<boolean>(false)
  const [newVersion, selectNewVersion] = useState<string>('')

  useEffect(() => {
    const INTERVAL = 10000
    var interval
    if (draft && shouldCheck) {
      interval = setInterval(checkForRebase, INTERVAL)
      checkForRebase()
    }

    async function checkForRebase() {
      if (!draft?.previousVersion) {
        return
      }

      const latestDoc = await grpcClient.publications.getPublication({
        documentId: draft!.id,
      })

      const prevVersion = draft.previousVersion.split('.')
      const latestVersion = latestDoc.version.split('.')
      /**
       * When I ask the backend for a publication without a version, it will respond
       * with the latest version for that particular owner and also combined with my latest changes if those are not deps from the owner.
       * this means that I need to check the latest version of the document with the previowVersion that my draft have
       */
      if (latestVersion && !_.isEqual(latestVersion, prevVersion)) {
        setRebase(true)
        selectNewVersion(
          latestVersion.length > 1 ? latestVersion.join('.') : latestVersion[0],
        )
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [shouldCheck])

  return {
    shouldRebase: rebase,
    newVersion,
  }
}

export function useDocument(
  docId: string | undefined,
  version?: string | undefined,
  options?: UseQueryOptions<HMDocument | null> & {
    draftId?: string
  },
) {
  const grpcClient = useGRPCClient()
  return useQuery(queryDocument({docId, version, grpcClient, ...options}))
}

export function useDocuments(
  docs: {docId?: string | undefined; version?: string | undefined}[],
  options?: UseQueryOptions<HMDocument | null>,
) {
  const grpcClient = useGRPCClient()
  return useQueries({
    queries: docs.map((docQ) => queryDocument({...docQ, grpcClient})),
    ...(options || {}),
  })
}

export function queryDocument({
  docId,
  version,
  grpcClient,
  ...options
}: {
  docId?: string
  version?: string
  grpcClient: GRPCClient
} & UseQueryOptions<HMDocument | null>): UseQueryOptions<HMDocument | null> {
  return {
    enabled: !!docId,
    queryKey: [queryKeys.EDITOR_DRAFT, docId],
    useErrorBoundary: false,
    queryFn: async () => {
      const doc = await grpcClient.documents.getDocument({
        documentId: docId,
        version: version || '',
      })
      return toPlainMessage(doc)
    },
    ...options,
  }
}

export function useProfile(
  docId: string | undefined,
  version?: string | undefined,
  options?: UseQueryOptions<HMDocument | null> & {
    draftId?: string
  },
) {
  // TODO: implement me!
  return {data: null}
}

export function useProfiles(
  ids: string[],
  options?: UseQueryOptions<HMDocument | null>,
) {
  const grpcClient = useGRPCClient()
  return useQueries({
    queries: ids.map((docId) => queryProfile({docId, grpcClient})),
    ...(options || {}),
  })
}

export function queryProfile({
  docId,
  version,
  grpcClient,
  ...options
}: {
  docId?: string
  version?: string
  grpcClient: GRPCClient
} & UseQueryOptions<HMDocument | null>): UseQueryOptions<HMDocument | null> {
  return {
    enabled: !!docId,
    queryKey: [queryKeys.EDITOR_DRAFT, docId],
    useErrorBoundary: false,
    queryFn: async () => {
      return toPlainMessage({})
    },
    ...options,
  }
}
