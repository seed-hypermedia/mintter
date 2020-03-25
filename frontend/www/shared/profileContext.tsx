import {createContext, useContext, useState, useEffect} from 'react'
import {
  UpdateProfileRequest,
  GetProfileRequest,
  InitProfileRequest,
  Profile,
} from '@mintter/proto/mintter_pb'
import {useRPC} from './rpc'

interface ProfileContextValue {
  profile: Profile
  setProfile?: (data: Partial<Profile.AsObject>) => void
  initProfile?: (data: InitProfileRequest.AsObject) => void
  hasProfile?: () => boolean
}

export const ProfileContext = createContext<ProfileContextValue>(null)

interface ProfileProviderProps {
  children: React.ReactNode
  value?: ProfileContextValue
}

const initialValue = {profile: null}

export default function ProfileProvider({
  children,
  value: propValue = initialValue,
}: ProfileProviderProps) {
  const [value, setValue] = useState(propValue.profile)
  const rpc = useRPC()

  useEffect(() => {
    rpc.getProfile(new GetProfileRequest()).then(resp => {
      const profile = resp.getProfile()
      console.log('profile on useEffect', profile)
      setValue(profile)
    })
  }, [])

  async function getProfile() {
    const profile_resp = await rpc.getProfile(new GetProfileRequest())
    const profile = profile_resp.getProfile()
    return profile
  }

  async function setProfile({
    username,
    email,
    twitterUsername,
  }: {
    username: string
    email: string
    twitterUsername: string
  }) {
    console.log('value ==>', value)

    const profile = await getProfile()
    username.length > 1 && profile.setUsername(username)
    email.length > 1 && profile.setEmail(email)
    twitterUsername.length > 1 && profile.setTwitterUsername(twitterUsername)
    const req = new UpdateProfileRequest()
    req.setProfile(value)
    try {
      await rpc.updateProfile(req)
    } catch (err) {
      console.error('setProfileError ===> ', err)
    }
  }

  function initProfile({
    aezeedPassphrase,
    mnemonicList,
    walletPassword,
  }: InitProfileRequest.AsObject) {
    const req = new InitProfileRequest()
    req.setAezeedPassphrase(aezeedPassphrase)
    req.setMnemonicList(mnemonicList)
    req.setWalletPassword(walletPassword)
    return rpc.initProfile(req)
  }

  function hasProfile() {
    const req = new UpdateProfileRequest()
    return req.hasProfile()
  }

  return (
    <ProfileContext.Provider
      value={{profile: value, setProfile, initProfile, hasProfile}}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
