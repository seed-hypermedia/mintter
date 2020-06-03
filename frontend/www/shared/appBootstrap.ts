import {queryCache} from 'react-query'
import {usersClient} from './mintterClient'
import {InitProfileRequest} from '@mintter/proto/mintter_pb'

async function profileFetcher() {}

export async function bootstrapAppData() {
  let appData = {profile: null}

  // TODO: add a user check
  const [profile] = await Promise.all([profileFetcher()])
  appData = {profile}
  queryCache.setQueryData('Profile', appData.profile)
  return appData
}
