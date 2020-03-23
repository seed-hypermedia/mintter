import {createContext, useContext, useState, useEffect} from 'react'
import {
  UpdateProfileRequest,
  GetProfileRequest,
  InitProfileRequest,
  Profile,
} from '@mintter/proto/mintter_pb'
import {useRPC} from './rpc'
/*
- UserContext Context
- UserProvider component
- useUser hook 
*/

export const ProfileContext = createContext(null)

// const initialValue = {
//     profile: {},
//     setProfile: () => void
//     createProfile: () => void
// }

interface ProfileProviderProps {
  children: React.ReactNode
  //   value?: string
}

export default function ProfileProvider({children}: ProfileProviderProps) {
  const [value, setValue] = useState(null)
  const rpc = useRPC()

  useEffect(() => {
    console.log('UserContext effect runned!')
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

  async function initProfile({passphrase, seed, password}) {
    const req = new InitProfileRequest()
    req.setAezeedPassphrase(passphrase)
    req.setMnemonicList(seed)
    req.setWalletPassword(password)
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
