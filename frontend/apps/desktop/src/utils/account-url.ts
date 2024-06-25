import {API_FILE_URL} from '@shm/shared'

export function getAvatarUrl(avatarCID?: string) {
  if (avatarCID) {
    return `${API_FILE_URL}/${avatarCID}`
  }
}
