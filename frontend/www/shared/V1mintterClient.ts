import getConfig from 'next/config'
import {Node} from 'slate'
import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'
import {
  GetProfileRequest,
  ConnectToPeerRequest,
  UpdateProfileRequest,
  InitProfileRequest,
  GetProfileAddrsRequest,
  ListProfilesRequest,
  ListProfilesResponse,
  GenSeedRequest,
  Profile,
  ListSuggestedProfilesResponse,
  ListSuggestedProfilesRequest,
} from '@mintter/proto/mintter_pb'

const config = getConfig()
const hostname = config?.publicRuntimeConfig.MINTTER_HOSTNAME
const port = config?.publicRuntimeConfig.MINTTER_PORT
const path = `${hostname}:${port}`

export const usersClient = new MintterPromiseClient(path)

// ============================

export async function genSeed() {
  const req = new GenSeedRequest()
  return await usersClient.genSeed(req)
}

export async function connectToPeerById(peerIds: string[]) {
  const req = new ConnectToPeerRequest()
  req.setAddrsList(peerIds)
  return await usersClient.connectToPeer(req)
}

export async function createProfile({
  aezeedPassphrase,
  mnemonicList,
  walletPassword,
}: InitProfileRequest.AsObject) {
  const req = new InitProfileRequest()
  req.setAezeedPassphrase(aezeedPassphrase)
  req.setMnemonicList(mnemonicList)
  req.setWalletPassword(walletPassword)
  return await usersClient.initProfile(req)
}

export async function getProfile(key, profileId?: string) {
  const req = new GetProfileRequest()
  if (profileId) {
    req.setProfileId(profileId)
  }

  try {
    return await (await usersClient.getProfile(req)).getProfile()
  } catch (err) {
    console.error('getProfile error ==> ', err)
  }
}

export async function setProfile(
  profile: Profile,
  {
    username,
    email,
    bio,
  }: {
    username: string
    email: string
    bio: string
  },
) {
  username.length > 1 && profile.setUsername(username)
  email.length > 1 && profile.setEmail(email)
  bio.length > 1 && profile.setBio(bio)
  const req = new UpdateProfileRequest()
  req.setProfile(profile)
  try {
    return await usersClient.updateProfile(req)
  } catch (err) {
    console.error('setProfileError ===> ', err)
  }
}

export async function getProfileAddrs() {
  const req = new GetProfileAddrsRequest()
  return await usersClient.getProfileAddrs(req)
}

export async function listConnections(
  key,
  page = 0,
): Promise<ListProfilesResponse> {
  const req = new ListProfilesRequest()
  req.setPageSize(page)
  return await usersClient.listProfiles(req)
}

export async function listSuggestedConnections(
  key,
  page = 0,
): Promise<ListSuggestedProfilesResponse> {
  const req = new ListSuggestedProfilesRequest()
  req.setPageSize(page)
  return await usersClient.listSuggestedProfiles(req)
}

export {MintterPromiseClient}
