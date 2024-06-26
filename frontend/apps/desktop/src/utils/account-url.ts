import {API_FILE_URL, HMDocument} from '@shm/shared'

export function getAvatarUrl(profile: HMDocument | null | undefined) {
  const image = profile?.metadata?.image
  if (image) {
    return `${API_FILE_URL}/${extractIpfsUrlCid(image)}`
  }
}

function extractIpfsUrlCid(url: string): null | string {
  const regex = /^ipfs:\/\/(.+)$/
  const match = url.match(regex)
  return match ? match[1] : null
}
