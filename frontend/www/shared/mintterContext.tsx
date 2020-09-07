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
import {ListDocumentsResponse} from '@mintter/proto/v2/documents_pb'

type QueryParam<T> = T | T[]

// TODO: (Horacio) Fixme Types
export interface MintterClient {
  listPublications: (
    page?: number,
  ) => PaginatedQueryResult<ListDocumentsResponse>
  getPublication: (id: QueryParam<string>) => QueryResult<Publication>
  getSections: (sections: any[]) => any
  listDrafts: (page?: number) => PaginatedQueryResult<ListDraftsResponse>
  createDraft: () => Draft
  getDraft: (
    id: QueryParam<string>,
    options?: QueryOptions<Draft>,
  ) => QueryResult<Draft>
  setDraft: (draft: oldAPI.SetDraftRequest) => Draft
  publishDraft: (
    documentId: string,
    options?: MutationOptions<Publication, string>,
  ) => MutationResult<Publication>
  deleteDraft: (id: string) => void
  getAuthor: (authorId?: string) => QueryResult<Profile>
}

const MintterClientContext = createContext<MintterClient>(null)

export function MintterProvider(props) {
  const listPublications = useCallback((page = 0): PaginatedQueryResult<
    ListDocumentsResponse
  > => {
    return usePaginatedQuery(
      ['ListPublications', page],
      apiClient.listDocuments,
      {
        refetchOnWindowFocus: true,
        refetchInterval: 5000,
      },
    )
  }, [])

  const getPublication = useCallback((id: QueryParam<string>) => {
    // type guard on id
    if (Array.isArray(id)) {
      throw new Error(
        `Impossible render: You are trying to access a publication passing ${
          id.length
        } publication IDs => ${id.map(q => q).join(', ')}`,
      )
    }

    return useQuery(['Publication', id], oldAPI.getPublication, {
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

  function listDrafts(page = 0): PaginatedQueryResult<ListDraftsResponse> {
    return usePaginatedQuery(['AllDrafts', page], oldAPI.listDrafts, {
      refetchInterval: 5000,
    })
  }

  const createDraft = useCallback(
    () => oldAPI.createDraft().catch(err => console.error(err)),
    [],
  )

  const getDraft = useCallback(
    (id: QueryParam<string>, options?: QueryOptions<Draft>) => {
      // type guard on id
      if (Array.isArray(id)) {
        throw new Error(
          `Impossible render: You are trying to access a draft passing ${
            id.length
          } document IDs => ${id.map(q => q).join(', ')}`,
        )
      }

      return useQuery(id && ['Draft', id], oldAPI.getDraft, {
        refetchOnWindowFocus: false,
        ...options,
      })
    },
    [],
  )

  const setDraft = useCallback(
    (draft: oldAPI.SetDraftRequest) => oldAPI.setDraft(draft),
    [],
  )

  const [deleteDraft] = useMutation((id: string) => oldAPI.deleteDraft(id), {
    onSuccess: p => {
      queryCache.refetchQueries('AllDrafts')
    },
  })

  const [publishDraft] = useMutation((id: string) => oldAPI.publishDraft(id))

  const getAuthor = useCallback(
    (authorId?: string) => useQuery(['Author', authorId], oldAPI.getProfile),
    [],
  )

  const value = useMemo(
    () => ({
      listPublications,
      getPublication,
      getSections,
      listDrafts,
      createDraft,
      getDraft,
      setDraft,
      publishDraft,
      deleteDraft,
      getAuthor,
    }),
    [
      listPublications,
      getPublication,
      getSections,
      listDrafts,
      createDraft,
      getDraft,
      setDraft,
      publishDraft,
      deleteDraft,
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
