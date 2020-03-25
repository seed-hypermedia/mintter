import {
  UpdateProfileRequest,
  GetProfileRequest,
  InitProfileRequest,
  Profile,
} from '@mintter/proto/mintter_pb'
import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'

export async function getProfile(): Promise<Profile> {
  const profile_req = new GetProfileRequest()
  const profile_resp = await rpc.getProfile(profile_req)
  const profile = await profile_resp.getProfile()

  return profile
}

export async function setProfile(rpc, {username, email, twitterUsername}) {
  username.length > 1 && value.setUsername(username)
  email.length > 1 && value.setEmail(email)
  twitterUsername.length > 1 && value.setTwitterUsername(twitterUsername)
  const req = new UpdateProfileRequest()
  req.setProfile(value)
  await rpc.updateProfile(req)
  getProfile()
}

export async function initProfile(
  rpc: MintterPromiseClient,
  {aezeedPassphrase, mnemonicList, walletPassword}: InitProfileRequest.AsObject,
) {
  const req = new InitProfileRequest()
  req.setAezeedPassphrase(aezeedPassphrase)
  req.setMnemonicList(mnemonicList)
  req.setWalletPassword(walletPassword)
  console.log('INIT PROFILE!')
  await rpc.initProfile(req)
}

export function hasProfile() {
  const req = new UpdateProfileRequest()
  return req.hasProfile()
}
