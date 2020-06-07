import {queryCache} from 'react-query'
import {usersClient} from './mintterClient'
import {
  InitProfileRequest,
  GetProfileRequest,
  Profile,
} from '@mintter/proto/mintter_pb'

export interface AppData {
  profile?: Profile
}

async function profileFetcher() {
  try {
    const req = new GetProfileRequest()
    return await usersClient.getProfile(req)
  } catch (err) {
    throw new Error(err)
  }
}

export async function bootstrapAppData(): Promise<AppData> {
  let appData = {profile: null}

  // TODO: add a user check
  const [profile] = await Promise.all([profileFetcher()])
  appData = {profile}
  queryCache.setQueryData('Profile', appData.profile)
  return appData
}
