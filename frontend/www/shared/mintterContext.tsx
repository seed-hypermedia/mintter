import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
  useEffect,
} from 'react'
import * as apiClient from './mintterClient'
import {
  Publication,
  Draft,
  ListPublicationsResponse,
} from '@mintter/proto/documents_pb'
import {QueryResult, PaginatedQueryResult} from 'react-query'
import {GetProfileResponse} from '@mintter/proto/mintter_pb'

type QueryParam<T> = T | T[]

// TODO: (Horacio) Fixme Types
export interface MintterClient {
  allPublications: (
    page?: number,
  ) => PaginatedQueryResult<ListPublicationsResponse>
  getPublication: (id: QueryParam<string>) => QueryResult<Publication>
  connectToPeerById: (peerIds: string[]) => any
  getSections: (sections: any[]) => any
  createDraft: () => Draft
  getAuthor: (authorId: string) => Promise<string>
  getProfile: () => QueryResult<GetProfileResponse>
  setProfile: () => any
}

const MintterClientContext = createContext<MintterClient>(null)

export function MintterProvider(props) {
  const allPublications = useCallback(
    (page: number) => apiClient.allPublications(page),
    [],
  )

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

  const createDraft = useCallback(
    () => apiClient.createDraft().catch(err => console.error(err)),
    [],
  )

  const connectToPeerById = useCallback(
    peerId => apiClient.connectToPeerById(peerId),
    [],
  )

  const getAuthor = useCallback(
    authorId => apiClient.getAuthor(authorId).catch(err => console.error(err)),
    [],
  )

  const value = useMemo(
    () => ({
      allPublications,
      getPublication,
      connectToPeerById,
      getSections,
      createDraft,
      getAuthor,
    }),
    [
      allPublications,
      getPublication,
      connectToPeerById,
      getSections,
      createDraft,
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

export function useAuthor(authorId: string) {
  const [author, setAuthor] = useState<string>('')
  const {getAuthor} = useMintter()

  useEffect(() => {
    fetchAuthor().then(r => {
      setAuthor(r)
    })

    async function fetchAuthor() {
      return await getAuthor(authorId)
    }
  }, [authorId])

  return author
}
