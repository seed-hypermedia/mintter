import {BACKEND_FILE_URL} from '@mintter/shared'

export function getAvatarUrl(avatarCID?: string) {
  if (avatarCID) {
    return `${BACKEND_FILE_URL}/${avatarCID}`
  }
}
