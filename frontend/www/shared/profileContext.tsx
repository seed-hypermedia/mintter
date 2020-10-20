import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react'
import {
  UpdateProfileRequest,
  GetProfileRequest,
  InitProfileRequest,
  Profile,
  GetProfileAddrsResponse,
  GetProfileResponse,
  GenSeedResponse,
  ListProfilesResponse,
  ConnectToPeerResponse,
  ListSuggestedProfilesResponse,
} from '@mintter/proto/mintter_pb'
import * as apiClient from './V1mintterClient'
import * as apiV2 from './mintterClient'
import {bootstrapAppData} from './appBootstrap'
import {FullPageSpinner} from 'components/fullPageSpinner'
import {FullPageErrorMessage} from 'components/errorMessage'
import {
  useQuery,
  useMutation,
  queryCache,
  QueryResult,
  PaginatedQueryResult,
  usePaginatedQuery,
  MutationResult,
} from 'react-query'

interface ProfileContextValue {
  setProfile: (data: Partial<Profile.AsObject>) => void
  createProfile: (form: InitProfileRequest.AsObject) => void
  getProfileAddrs: () => QueryResult<GetProfileAddrsResponse>
  genSeed: () => Promise<GenSeedResponse>
  connectToPeerById: (
    peerIds: string[],
  ) => MutationResult<ConnectToPeerResponse>
  listConnections: () => PaginatedQueryResult<ListProfilesResponse>
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
  function refetchProfile(params) {
    queryCache.refetchQueries('Profile')
  }

  const genSeed = useCallback(() => apiClient.genSeed(), [])

  const [createProfile] = useMutation(apiClient.createProfile, {
    onSuccess: refetchProfile,
  })

  const [setProfile] = useMutation(
    async formData => apiV2.setProfile(formData),
    {
      onSuccess: refetchProfile,
    },
  )

  function getProfileAddrs() {
    return useQuery(['ProfileAddrs'], apiClient.getProfileAddrs, {
      refetchInterval: 5000,
    })
  }

  const [connectToPeerById] = useMutation(
    peerIds => apiClient.connectToPeerById(peerIds),
    {
      onSuccess: () => {
        queryCache.refetchQueries('ListConnections')
      },
      onError: params => {
        throw new Error(`Connection to Peer error -> ${JSON.stringify(params)}`)
      },
    },
  )

  function listConnections(page = 0) {
    return usePaginatedQuery(
      ['ListConnections', page],
      apiClient.listConnections,
      {
        refetchOnWindowFocus: true,
        refetchInterval: 5000,
      },
    )
  }

  function listSuggestedConnections(page = 0) {
    return usePaginatedQuery(
      ['ListSuggestedConnections', page],
      apiClient.listSuggestedConnections,
      {
        refetchOnWindowFocus: true,
        refetchInterval: 5000,
      },
    )
  }

  const value = {
    createProfile,
    setProfile,
    getProfileAddrs,
    genSeed,
    connectToPeerById,
    listConnections,
    listSuggestedConnections,
  }

  return (
    <ProfileContext.Provider value={{...value, ...props.value}} {...props} />
  )
}

export function useProfileContext() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error(`"useProfile" must be used within a "ProfileProvider"`)
  }

  return context
}
