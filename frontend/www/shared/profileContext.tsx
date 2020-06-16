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
} from '@mintter/proto/mintter_pb'
import * as apiClient from './mintterClient'
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
} from 'react-query'

interface ProfileContextValue {
  readonly profile: Profile | null
  setProfile: (data: Partial<Profile.AsObject>) => void
  createProfile: (form: InitProfileRequest.AsObject) => void
  getProfileAddrs: () => QueryResult<GetProfileAddrsResponse>
  genSeed: () => Promise<GenSeedResponse>
  connectToPeerById: (peerIds: string[]) => any
  getProfile: (profileId?: string) => QueryResult<Profile>
  allConnections: () => PaginatedQueryResult<ListProfilesResponse>
}

// TODO: (horacio): Fixme types ☝
export const ProfileContext = createContext<ProfileContextValue>(null)

export function ProfileProvider(props) {
  const {status, error, data} = useQuery('Profile', apiClient.getProfile, {
    retry: false,
  })

  function handleOnSuccess(params) {
    queryCache.refetchQueries('Profile')
  }

  const profile = data

  const genSeed = useCallback(() => apiClient.genSeed(), [])

  const [createProfile] = useMutation(apiClient.createProfile, {
    onSuccess: handleOnSuccess,
  })

  const getProfile = useCallback(
    (profileId?: string) =>
      useQuery(['Profile', profileId], apiClient.getProfile, {
        refetchOnWindowFocus: true,
      }),
    [profile],
  )

  const [setProfile] = useMutation(
    formData => apiClient.setProfile(profile, formData),
    {
      onSuccess: handleOnSuccess,
    },
  )

  function getProfileAddrs() {
    return useQuery(['ProfileAddrs'], apiClient.getProfileAddrs)
  }

  const connectToPeerById = useCallback(
    peerId => apiClient.connectToPeerById(peerId),
    [],
  )

  function allConnections(page = 0): PaginatedQueryResult<any> {
    return usePaginatedQuery(['AllConnections', page], apiClient.allConnections)
  }

  const value = useMemo(
    () => ({
      profile,
      getProfile,
      createProfile,
      setProfile,
      getProfileAddrs,
      genSeed,
      connectToPeerById,
      allConnections,
    }),
    [
      profile,
      getProfile,
      createProfile,
      setProfile,
      getProfileAddrs,
      genSeed,
      connectToPeerById,
      allConnections,
    ],
  )

  if (status === 'loading') {
    return <FullPageSpinner />
  }

  if (status === 'error') {
    return <FullPageErrorMessage error={error} />
  }

  if (status === 'success') {
    return <ProfileContext.Provider value={value} {...props} />
  }

  throw new Error(`Unhandled status: ${status}`)
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error(`useProfile must be used within a ProfileProvider`)
  }

  return context
}
