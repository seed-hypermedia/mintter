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
  setProfile: (data: Partial<Profile.AsObject>) => void
  initProfile: (data: InitProfileRequest.AsObject) => void
}

export const ProfileContext = createContext<ProfileContextValue>(null)

interface ProfileProviderProps {
  children: React.ReactNode
  value?: Partial<ProfileContextValue>
}

export default function ProfileProvider({
  children,
  value: propValue = null,
}: ProfileProviderProps) {
  const [value, setValue] = useState(propValue)
  const rpc = useRPC()

  useEffect(() => {
    getProfile()
  }, [])

  async function getProfile() {
    const profile_req = new GetProfileRequest()
    const profile_resp = await rpc.getProfile(profile_req)
    setValue(profile_resp.getProfile())
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
    username.length > 1 && value.setUsername(username)
    email.length > 1 && value.setEmail(email)
    twitterUsername.length > 1 && value.setTwitterUsername(twitterUsername)
    const req = new UpdateProfileRequest()
    req.setProfile(value)
    await rpc.updateProfile(req)
    getProfile()
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
  }

  return (
    <ProfileContext.Provider value={{profile: value, setProfile, initProfile}}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
