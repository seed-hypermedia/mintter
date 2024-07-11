import {API_FILE_URL} from '@shm/shared'

export function getAvatarUrl(image?: string) {
  if (image) {
    return `${API_FILE_URL}/${extractIpfsUrlCid(image)}`
  }

  return ''
}

function extractIpfsUrlCid(url: string): null | string {
  const regex = /^ipfs:\/\/(.+)$/
  const match = url.match(regex)
  return match ? match[1] : null
}
