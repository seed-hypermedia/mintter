import {ADMIN_ROUTE} from '@app/constants'

export const createPath = (url: string, path: string): string => {
  if (path.split('')[0] === '/') {
    throw new Error(`"createPath function Error => The path passed cannot have '/' at the beginning: check ${path}`)
  }

  return `${url}${url == '/' ? '' : '/'}${path}`
}

export const getPath = (path: string): string => {
  return path.includes(ADMIN_ROUTE) ? `/${ADMIN_ROUTE}` : ''
}
