import {API_FILE_URL} from '@mintter/shared'

export function getAvatarUrl(avatarCID?: string) {
  if (avatarCID) {
    return `${API_FILE_URL}/${avatarCID}`
  }
}
