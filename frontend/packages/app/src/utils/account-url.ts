import {BACKEND_FILE_URL} from '../constants'

export function getAccountUrl(accountId: string, host?: string): string {
  const urlHost = host || 'https://mintter.com'
  const url = `${urlHost}/a/${accountId}`
  return url
}

export function getAvatarUrl(avatarCID?: string) {
  if (avatarCID) {
    return `${BACKEND_FILE_URL}/${avatarCID}`
  }
}
