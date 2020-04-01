import {
  createContext,
  useContext,
  useEffect,
  MutableRefObject,
  useState,
} from 'react'
import {
  UpdateProfileRequest,
  GetProfileRequest,
  InitProfileRequest,
  Profile,
} from '@mintter/proto/mintter_pb'
import rpcModule from './rpc'
import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'

interface ProfileContextValue {
  readonly profile: Profile | null
  setProfile?: (data: Partial<Profile.AsObject>) => void
  initProfile?: (data: InitProfileRequest.AsObject) => void
  hasProfile?: () => Promise<boolean>
}

export const ProfileContext = createContext<ProfileContextValue>(null)

interface ProfileProviderProps {
  children: React.ReactNode
  value?: ProfileContextValue
  rpc?: MintterPromiseClient
}

export default function ProfileProvider({
  children,
  value: {profile: propProfile = null, ...rest} = {profile: null},
  rpc = rpcModule,
}: ProfileProviderProps) {
  const [profile, setLocalProfile] = useState<Profile>(propProfile)

  useEffect(() => {
    rpc.getProfile(new GetProfileRequest()).then(data => {
      if (!data.hasProfile()) {
        const resp = data.getProfile()
        setLocalProfile(resp)
      }
    })
  }, [])

  async function getProfile() {
    const profile_resp = await rpc.getProfile(new GetProfileRequest())
    const profile = profile_resp.getProfile()
    setLocalProfile(profile)
    return profile
  }

  async function setProfile({
    username,
    email,
  }: {
    username: string
    email: string
  }) {
    const profile = await getProfile()
    username.length > 1 && profile.setUsername(username)
    email.length > 1 && profile.setEmail(email)
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
      value={{profile, setProfile, initProfile, hasProfile, ...rest}}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
