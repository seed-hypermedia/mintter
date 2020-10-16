import React from 'react'
import {ReactEditor} from 'slate-react'
import * as apiClient from './mintterClient'
import {SlateBlock} from '@mintter/editor'
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
import {useProfile} from './profileContext'

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

const MintterClientContext = React.createContext<MintterClient>(null)

export const useDocuments = (options = {}) => {}

export function usePublications(options = {}) {
  const docsQuery = useQuery('Documents', apiClient.listDocuments, {
    ...options,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  })

  const data = React.useMemo(() => docsQuery.data?.toObject().documentsList, [
    docsQuery.data,
  ])

  return {
    ...docsQuery,
    data,
  }
}

export function useMyPublications(options = {}) {
  const docsQuery = usePublications(options)
  const {profile} = useProfile()

  const userId = React.useMemo(() => profile.toObject().accountId, [profile])

  const data = React.useMemo(
    () =>
      docsQuery.data?.filter(doc => {
        return doc.author === userId
      }),
    [docsQuery.data, userId],
  )

  return {
    ...docsQuery,
    data,
  }
}

export function useOthersPublications(options = {}) {
  const docsQuery = usePublications(options)
  const {profile} = useProfile()

  const userId = React.useMemo(() => profile.toObject().accountId, [profile])

  const data = React.useMemo(
    () =>
      docsQuery.data?.filter(doc => {
        return doc.author !== userId
      }),
    [docsQuery.data, userId],
  )

  return {
    ...docsQuery,
    data,
  }
}

export function useDrafts(options = {}) {
  const docsQuery = useQuery(
    'Drafts',
    () => apiClient.listDocuments('Drafts', PublishingState.DRAFT),
    {
      ...options,
      refetchOnWindowFocus: true,
      refetchInterval: 10000,
    },
  )

  const data = React.useMemo(() => docsQuery.data?.toObject().documentsList, [
    docsQuery.data,
  ])

  return {
    ...docsQuery,
    data,
  }
}

export function useDocument(version, options = {}) {
  if (!version) {
    throw new Error(`useDocument: parameter "version" is required`)
  }

  if (Array.isArray(version)) {
    throw new Error(
      `Impossible render: You are trying to access a document passing ${
        version.length
      } document versions => ${version.map(q => q).join(', ')}`,
    )
  }

  const docQuery = useQuery(['Document', version], apiClient.getDocument, {
    refetchOnWindowFocus: false,
    ...options,
  })

  const data = React.useMemo(() => docQuery.data?.toObject?.(), [docQuery.data])

  return {
    ...docQuery,
    data,
  }
}

export function useAuthor(authorId, options = {}) {
  let key = ['Author']
  if (authorId) {
    key.push(authorId)
  }

  const authorQuery = useQuery(key, apiClient.getProfile)

  const data = React.useMemo(() => authorQuery.data?.toObject(), [
    authorQuery.data,
  ])

  return {
    ...authorQuery,
    data,
  }
}

export function MintterProvider(props) {
  const createDraft = React.useCallback(
    () => apiClient.createDraft().catch(err => console.error(err)),
    [],
  )

  const getDocument = React.useCallback((version, options) => {}, [])

  const setDocument = React.useCallback(apiClient.setDocument, [])

  const [deleteDocument] = useMutation(apiClient.deleteDocument, {
    onSuccess: p => {
      queryCache.refetchQueries('ListDrafts')
    },
  })

  const [publishDraft] = useMutation(apiClient.publishDraft)

  const getAuthor = React.useCallback(
    (authorId?: string) => useQuery(['Author', authorId], apiClient.getProfile),
    [],
  )

  const value = {
    createDraft,
    getDocument,
    setDocument,
    publishDraft,
    deleteDocument,
    getAuthor,
  }

  return <MintterClientContext.Provider value={value} {...props} />
}

export function useMintter() {
  const context = React.useContext(MintterClientContext)

  if (context === undefined) {
    throw new Error(`useMintter must be used within a MintterProvider`)
  }

  return context
}
