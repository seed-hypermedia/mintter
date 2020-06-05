import {createContext, useContext, useMemo, useCallback} from 'react'
import {Node} from 'slate'
import * as apiClient from './mintterClient'
import {
  Publication,
  Draft,
  ListPublicationsResponse,
  ListDraftsResponse,
} from '@mintter/proto/documents_pb'
import {
  usePaginatedQuery,
  QueryResult,
  PaginatedQueryResult,
  QueryOptions,
  useMutation,
  MutationResult,
  MutationOptions,
} from 'react-query'
import {
  GetProfileResponse,
  GetProfileAddrsResponse,
} from '@mintter/proto/mintter_pb'

type QueryParam<T> = T | T[]

// TODO: (Horacio) Fixme Types
export interface MintterClient {
  allPublications: (
    page?: number,
  ) => PaginatedQueryResult<ListPublicationsResponse>
  getPublication: (id: QueryParam<string>) => QueryResult<Publication>
  getSections: (sections: any[]) => any
  allDrafts: (page?: number) => PaginatedQueryResult<ListDraftsResponse>
  createDraft: () => Draft
  getDraft: (
    id: QueryParam<string>,
    options?: QueryOptions<Draft>,
  ) => QueryResult<Draft>
  setDraft: (draft: apiClient.SetDraftRequest) => Draft
  publishDraft: (
    documentId: string,
    options?: MutationOptions<Publication, string>,
  ) => MutationResult<Publication>
  connectToPeerById: (peerIds: string[]) => any
  getProfile: () => QueryResult<GetProfileResponse>
  setProfile: () => any
  getAuthor: (authorId: string) => Promise<string>
  getProfileAddrs: () => Promise<GetProfileAddrsResponse>
}

const MintterClientContext = createContext<MintterClient>(null)

export function MintterProvider(props) {
  function allPublications(
    page = 0,
  ): PaginatedQueryResult<ListPublicationsResponse> {
    return usePaginatedQuery(
      ['AllPublications', page],
      apiClient.allPublications,
    )
  }

  const getPublication = useCallback((id: QueryParam<string>) => {
    // type guard on id
    if (Array.isArray(id)) {
      throw new Error(
        `Impossible render: You are trying to access a publication passing ${
          id.length
        } publication IDs => ${id.map(q => q).join(', ')}`,
      )
    }

    return apiClient.getPublication(id)
  }, [])

  const getSections = useCallback(
    sections =>
      apiClient.getSections(sections).catch(err => console.error(err)),
    [],
  )

  function allDrafts(page = 0): PaginatedQueryResult<ListDraftsResponse> {
    return usePaginatedQuery(['AllDrafts', page], apiClient.allDrafts)
  }

  const createDraft = useCallback(
    () => apiClient.createDraft().catch(err => console.error(err)),
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

      return apiClient.getDraft(id, options)
    },
    [],
  )

  const setDraft = useCallback(
    (draft: apiClient.SetDraftRequest) => apiClient.setDraft(draft),
    [],
  )

  const [publishDraft] = useMutation((id: string) => apiClient.publishDraft(id))

  const connectToPeerById = useCallback(
    peerId => apiClient.connectToPeerById(peerId),
    [],
  )

  const value = useMemo(
    () => ({
      allPublications,
      getPublication,
      getSections,
      allDrafts,
      createDraft,
      getDraft,
      setDraft,
      publishDraft,
      connectToPeerById,
    }),
    [
      allPublications,
      getPublication,
      getSections,
      allDrafts,
      createDraft,
      getDraft,
      setDraft,
      publishDraft,
      connectToPeerById,
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
