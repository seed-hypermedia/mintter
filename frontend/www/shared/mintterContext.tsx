import {createContext, useContext, useMemo, useCallback} from 'react'
import {ReactEditor} from 'slate-react'
import * as apiClient from './mintterClient'
import {SlateBlock} from '@mintter/editor'
import {
  Publication,
  Draft,
  ListPublicationsResponse,
  ListDraftsResponse,
} from '@mintter/proto/documents_pb'
import {
  useQuery,
  usePaginatedQuery,
  QueryResult,
  PaginatedQueryResult,
  QueryOptions,
  useMutation,
  MutationResult,
  MutationOptions,
  queryCache,
  AnyQueryKey,
} from 'react-query'
import {
  GetProfileResponse,
  GetProfileAddrsResponse,
  ListProfilesResponse,
  Profile,
} from '@mintter/proto/mintter_pb'
import {
  ListDocumentsResponse,
  GetDocumentRequest,
  Document,
  PublishingState,
  GetDocumentResponse,
  UpdateDraftResponse,
  PublishDraftResponse,
} from '@mintter/proto/v2/documents_pb'

type QueryParam<T> = T | T[]

export interface SetDocumentRequest {
  document: {
    id: string
    version: string | string[]
    author: string
  }
  state: {
    title: string
    subtitle: string
    blocks: SlateBlock[]
  }
}

// TODO: (Horacio) Fixme Types
export interface MintterClient {
  listPublications: (
    page?: number,
  ) => PaginatedQueryResult<ListDocumentsResponse>
  listDrafts: (page?: number) => PaginatedQueryResult<ListDocumentsResponse>
  createDraft: () => Document
  getDocument: (
    version: QueryParam<string>,
    options?: QueryOptions<GetDocumentResponse>,
  ) => QueryResult<GetDocumentResponse>
  setDocument: (editor: ReactEditor) => (input: SetDocumentRequest) => void
  publishDraft: (
    version: string,
    options?: MutationOptions<PublishDraftResponse, string>,
  ) => MutationResult<Document>
  deleteDocument: (id: string) => void
  getAuthor: (authorId?: string) => QueryResult<Profile>
}

const MintterClientContext = createContext<MintterClient>(null)

export function MintterProvider(props) {
  const listPublications = useCallback((page = 0): PaginatedQueryResult<
    ListDocumentsResponse
  > => {
    return usePaginatedQuery(
      ['ListPublications', PublishingState.PUBLISHED, page],
      apiClient.listPublications,
      {
        refetchOnWindowFocus: true,
        refetchInterval: 5000,
      },
    )
  }, [])

  function listDrafts(page = 0): PaginatedQueryResult<ListDocumentsResponse> {
    return usePaginatedQuery(['ListDrafts', page], apiClient.listDrafts, {
      refetchInterval: 5000,
    })
  }

  const createDraft = useCallback(
    () => apiClient.createDraft().catch(err => console.error(err)),
    [],
  )

  const getDocument = useCallback((version, options) => {
    // type guard on version
    if (!version) {
      throw new Error(`getDocument: parameter "version" is required`)
    }

    if (Array.isArray(version)) {
      throw new Error(
        `Impossible render: You are trying to access a document passing ${
          version.length
        } document versions => ${version.map(q => q).join(', ')}`,
      )
    }

    return useQuery(['Document', version], apiClient.getDocument, {
      refetchOnWindowFocus: false,
      ...options,
    })
  }, [])

  const setDocument = useCallback(apiClient.setDocument, [])

  const [deleteDocument] = useMutation(apiClient.deleteDocument, {
    onSuccess: p => {
      queryCache.refetchQueries('ListDrafts')
    },
  })

  const [publishDraft] = useMutation(apiClient.publishDraft)

  const getAuthor = useCallback(
    (authorId?: string) => useQuery(['Author', authorId], apiClient.getProfile),
    [],
  )

  const value = useMemo(
    () => ({
      listPublications,
      listDrafts,
      createDraft,
      getDocument,
      setDocument,
      publishDraft,
      deleteDocument,
      getAuthor,
    }),
    [
      listPublications,
      listDrafts,
      createDraft,
      getDocument,
      setDocument,
      publishDraft,
      deleteDocument,
      getAuthor,
    ],
  )

  return <MintterClientContext.Provider value={value} {...props} />
}

export function useMintter() {
  const context = useContext(MintterClientContext)

  if (context === undefined) {
    throw new Error(`useMintter must be used within a MintterProvider`)
  }

  return context
}
