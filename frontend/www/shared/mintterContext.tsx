import {createContext, useContext, useMemo, useCallback} from 'react'
import * as oldAPI from './V1mintterClient'
import * as apiClient from './mintterClient'
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
} from '@mintter/proto/v2/documents_pb'

type QueryParam<T> = T | T[]

export interface SetDocumentRequest {
  documentVersion: string | string[]
  title: string
  subtitle: string
  blocks: any[]
}

// TODO: (Horacio) Fixme Types
export interface MintterClient {
  listPublications: (
    page?: number,
  ) => PaginatedQueryResult<ListDocumentsResponse>
  getDocument: (id: string) => QueryResult<Document>
  getSections: (sections: any[]) => any
  listDrafts: (page?: number) => PaginatedQueryResult<ListDocumentsResponse>
  createDraft: () => Document
  getDraft: (
    id: QueryParam<string>,
    options?: QueryOptions<Document>,
  ) => QueryResult<Document>
  setDraft: (draft: SetDocumentRequest) => Document
  publishDraft: (
    documentVersion: string,
    options?: MutationOptions<Publication, string>,
  ) => MutationResult<Publication>
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

  const getDocument = useCallback((id: QueryParam<string>) => {
    // type guard on id
    if (Array.isArray(id)) {
      throw new Error(
        `Impossible render: You are trying to access a publication passing ${
          id.length
        } publication IDs => ${id.map(q => q).join(', ')}`,
      )
    }

    return useQuery(['Document', id], apiClient.getDocument, {
      retry: false,
      onError: error => {
        console.log('error!', error)
      },
    })
  }, [])

  const getSections = useCallback(
    sections => oldAPI.getSections(sections).catch(err => console.error(err)),
    [],
  )

  function listDrafts(page = 0): PaginatedQueryResult<ListDocumentsResponse> {
    return usePaginatedQuery(['ListDrafts', page], apiClient.listDrafts, {
      refetchInterval: 5000,
    })
  }

  const createDraft = useCallback(
    () => apiClient.createDraft().catch(err => console.error(err)),
    [],
  )

  const getDraft = useCallback((id, options) => {
    // type guard on id
    if (!id) {
      throw new Error(`getDraft: parameter "id" is required`)
    }

    if (Array.isArray(id)) {
      throw new Error(
        `Impossible render: You are trying to access a draft passing ${
          id.length
        } document IDs => ${id.map(q => q).join(', ')}`,
      )
    }

    return useQuery(['Draft', id], apiClient.getDocument, {
      refetchOnWindowFocus: false,
      ...options,
    })
  }, [])

  const setDraft = useCallback(
    (draft: oldAPI.SetDraftRequest) => oldAPI.setDraft(draft),
    [],
  )

  const [deleteDocument] = useMutation(
    (version: string) => apiClient.deleteDocument(version),
    {
      onSuccess: p => {
        queryCache.refetchQueries('ListDrafts')
      },
    },
  )

  const [publishDraft] = useMutation((id: string) => oldAPI.publishDraft(id))

  const getAuthor = useCallback(
    (authorId?: string) => useQuery(['Author', authorId], oldAPI.getProfile),
    [],
  )

  const value = useMemo(
    () => ({
      listPublications,
      getDocument,
      getSections,
      listDrafts,
      createDraft,
      getDraft,
      setDraft,
      publishDraft,
      deleteDocument,
      getAuthor,
    }),
    [
      listPublications,
      getDocument,
      getSections,
      listDrafts,
      createDraft,
      getDraft,
      setDraft,
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
