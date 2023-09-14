import {BACKEND_FILE_URL} from '../constants'

export function getAvatarUrl(avatarCID?: string) {
  if (avatarCID) {
    return `${BACKEND_FILE_URL}/${avatarCID}`
  }
}
