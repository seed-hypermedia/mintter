import {queryCache} from 'react-query'
import {usersClient} from './mintterClient'
import {GetProfileRequest} from '@mintter/proto/mintter_pb'

async function profileFetcher() {
  const req = new GetProfileRequest()
  return await usersClient.getProfile(req)
}

export async function bootstrapAppData() {
  let appData = {profile: null}

  // TODO: add a user check
  const [profile] = await Promise.all([profileFetcher()])
  appData = {profile}
  queryCache.setQueryData('Profile', appData.profile)
  return appData
}
