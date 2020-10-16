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
  readonly profile: Profile | null
  setProfile: (data: Partial<Profile.AsObject>) => void
  createProfile: (form: InitProfileRequest.AsObject) => void
  getProfileAddrs: () => QueryResult<GetProfileAddrsResponse>
  genSeed: () => Promise<GenSeedResponse>
  connectToPeerById: (
    peerIds: string[],
  ) => MutationResult<ConnectToPeerResponse>
  getProfile: (profileId?: string) => QueryResult<Profile>
  listConnections: () => PaginatedQueryResult<ListProfilesResponse>
  listSuggestedConnections: () => PaginatedQueryResult<
    ListSuggestedProfilesResponse
  >
}

export function useProfile(accountId?: string, options = {}) {
  let queryKey = ['Profile']

  if (accountId) {
    queryKey.push(accountId)
  }

  const profileQuery = useQuery(queryKey, apiClient.getProfile, options)

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
  const {status, error, data} = useQuery('Profile', apiClient.getProfile)

  function refetchProfile(params) {
    queryCache.refetchQueries('Profile')
  }

  const profile = data

  const genSeed = useCallback(() => apiClient.genSeed(), [])

  const [createProfile] = useMutation(apiClient.createProfile, {
    onSuccess: refetchProfile,
  })

  const getProfile = useCallback(
    (profileId?: string) =>
      useQuery(['Profile', profileId], apiClient.getProfile),
    [profile],
  )

  const [setProfile] = useMutation(
    formData => apiClient.setProfile(profile, formData),
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
    profile,
    getProfile,
    createProfile,
    setProfile,
    getProfileAddrs,
    genSeed,
    connectToPeerById,
    listConnections,
    listSuggestedConnections,
  }

  if (status === 'loading') {
    return <FullPageSpinner />
  }

  if (status === 'error') {
    return <FullPageErrorMessage error={error} />
  }

  if (status === 'success') {
    return (
      <ProfileContext.Provider value={{...value, ...props.value}} {...props} />
    )
  }

  throw new Error(`Unhandled status: ${status}`)
}

export function useProfileContext() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error(`"useProfile" must be used within a "ProfileProvider"`)
  }

  return context
}
