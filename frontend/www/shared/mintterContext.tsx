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

// TODO: (Horacio) Fixme Types
export interface MintterClient {
  allPublications: () => Promise<ListPublicationsResponse>
  getPublication: (p: any) => Promise<Publication>
  connectToPeerById: (peerIds: string[]) => any
  getSections: (sections: any[]) => any
  createDraft: () => Draft
  getAuthor: (authorId: string) => Promise<string>
}

const MintterClientContext = createContext<MintterClient>(null)

export function MintterProvider(props) {
  const allPublications = useCallback(
    form => apiClient.allPublications().catch(err => console.error(err)),
    [],
  )

  const getPublication = useCallback(
    (key, id) => apiClient.getPublication(id).catch(err => console.error(err)),
    [],
  )

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
    peerId =>
      apiClient.connectToPeerById(peerId).catch(err => console.error(err)),
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
