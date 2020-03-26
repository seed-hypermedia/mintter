import {
  createContext,
  useContext,
  useEffect,
  useRef,
  RefObject,
  MutableRefObject,
} from 'react'
import {
  UpdateProfileRequest,
  GetProfileRequest,
  InitProfileRequest,
  Profile,
} from '@mintter/proto/mintter_pb'
import {useRPC} from './rpc'

interface ProfileContextValue {
  readonly profile: MutableRefObject<Profile>
  setProfile?: (data: Partial<Profile.AsObject>) => void
  initProfile?: (data: InitProfileRequest.AsObject) => void
  hasProfile?: () => Promise<boolean>
}

export const ProfileContext = createContext<ProfileContextValue>(null)

interface ProfileProviderProps {
  children: React.ReactNode
  value?: ProfileContextValue
}

export default function ProfileProvider({
  children,
  value: {profile: propProfile = null, ...rest} = {profile: null},
}: ProfileProviderProps) {
  const value = useRef<Profile>(propProfile)
  const rpc = useRPC()

  useEffect(() => {
    rpc.getProfile(new GetProfileRequest()).then(resp => {
      const profile = resp.getProfile()
      value.current = profile
    })
  }, [])

  async function getProfile() {
    const profile_resp = await rpc.getProfile(new GetProfileRequest())
    const profile = profile_resp.getProfile()
    value.current = profile
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
    const profile = await getProfile()
    username.length > 1 && profile.setUsername(username)
    email.length > 1 && profile.setEmail(email)
    twitterUsername.length > 1 && profile.setTwitterUsername(twitterUsername)
    const req = new UpdateProfileRequest()
    req.setProfile(profile)
    try {
      await rpc.updateProfile(req)
    } catch (err) {
      console.error('setProfileError ===> ', err)
    }
  }

  async function initProfile({
    aezeedPassphrase,
    mnemonicList,
    walletPassword,
  }: InitProfileRequest.AsObject) {
    const req = new InitProfileRequest()
    req.setAezeedPassphrase(aezeedPassphrase)
    req.setMnemonicList(mnemonicList)
    req.setWalletPassword(walletPassword)
    await rpc.initProfile(req)
    getProfile()
  }

  async function hasProfile() {
    const req = new GetProfileRequest()
    const resp = await rpc.getProfile(req)
    return resp.hasProfile()
  }
  return (
    <ProfileContext.Provider
      value={{profile: value, setProfile, initProfile, hasProfile, ...rest}}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
