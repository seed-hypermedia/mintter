import {createContext, useContext, useCallback, useMemo} from 'react'
import {
  InitProfileRequest,
  Profile,
  GetProfileAddrsResponse,
  GenSeedResponse,
  ListSuggestedProfilesResponse,
} from '@mintter/api/v2/mintter_pb'
import * as apiClient from './mintter-client'
import {
  useQuery,
  useMutation,
  queryCache,
  QueryResult,
  PaginatedQueryResult,
  usePaginatedQuery,
} from 'react-query'

interface ProfileContextValue {
  setProfile: (data: Partial<Profile.AsObject>) => void
  createProfile: (form: InitProfileRequest.AsObject) => void
  getProfileAddrs: () => QueryResult<GetProfileAddrsResponse>
  genSeed: () => Promise<GenSeedResponse>
  listSuggestedConnections: () => PaginatedQueryResult<
    ListSuggestedProfilesResponse
  >
}

export function useProfile(options = {}) {
  const profileQuery = useQuery(['Profile'], apiClient.getProfile, options)

  const data = useMemo(() => profileQuery.data?.toObject?.(), [
    profileQuery.data,
  ])

  return {
    ...profileQuery,
    data,
  }
}

export function useAuthor(accountId, options = {}) {
  const profileQuery = useQuery(
    accountId && ['Author', accountId],
    apiClient.getProfile,
    options,
  )

  const data = useMemo(() => profileQuery.data?.toObject?.(), [
    profileQuery.data,
  ])

  return {
    ...profileQuery,
    data,
  }
}

// TODO: (horacio): Fixme types ☝
export const ProfileContext = createContext<ProfileContextValue>(null)

export function ProfileProvider(props) {
  function refetchProfile() {
    queryCache.refetchQueries('Profile')
  }

  const genSeed = useCallback(apiClient.genSeed, [])

  const [createProfile] = useMutation(apiClient.createProfile, {
    onSuccess: refetchProfile,
  })

  const [setProfile] = useMutation(
    async formData => apiClient.setProfile(formData),
    {
      onSuccess: refetchProfile,
    },
  )

  function getProfileAddrs() {
    return useQuery(['ProfileAddrs'], apiClient.getProfileAddrs, {
      refetchInterval: 5000,
    })
  }

  const value = {
    createProfile,
    setProfile,
    getProfileAddrs,
    genSeed,
  }

  return (
    <ProfileContext.Provider value={{...value, ...props.value}} {...props} />
  )
}

export function useProfileAddrs() {
  const profileAddrsQuery = useQuery(
    ['ProfileAddrs'],
    apiClient.getProfileAddrs,
    {
      refetchInterval: 5000,
    },
  )

  const data = useMemo(() => profileAddrsQuery.data?.toObject().addrsList, [
    profileAddrsQuery.data,
  ])

  return {
    ...profileAddrsQuery,
    data,
  }
}

export function useConnectionList({page} = {page: 0}, options = {}) {
  const connectionsQuery = usePaginatedQuery(
    ['ListConnections', page],
    apiClient.listConnections,
    {
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
      ...options,
    },
  )

  const data = useMemo(() => connectionsQuery.data?.toObject().profilesList, [
    connectionsQuery.data,
  ])

  return {
    ...connectionsQuery,
    data,
  }
}

export function useSuggestedConnections({page} = {page: 0}, options = {}) {
  const suggestionsQuery = usePaginatedQuery(
    ['ListSuggestedConnections', page],
    apiClient.listSuggestedConnections,
    {
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
      ...options,
    },
  )

  const data = useMemo(() => suggestionsQuery.data?.toObject().profilesList, [
    suggestionsQuery.data,
  ])

  return {
    ...suggestionsQuery,
    data,
  }
}

export function useConnectionCreate() {
  const [connectToPeer, mutationOptions] = useMutation(
    (peerIds?: string[]) => apiClient.connectToPeerById(peerIds),
    {
      onSuccess: () => {
        queryCache.refetchQueries(['ListConnections'])
        queryCache.refetchQueries(['ListSuggestedConnections'])
        queryCache.refetchQueries(['Documents'])
      },
      onError: params => {
        throw new Error(`Connection to Peer error -> ${JSON.stringify(params)}`)
      },
    },
  )

  return {
    connectToPeer,
    ...mutationOptions,
  }
}

export function useProfileContext() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error(`"useProfile" must be used within a "ProfileProvider"`)
  }

  return context
}
