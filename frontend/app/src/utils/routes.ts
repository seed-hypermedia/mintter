import type {match as Match} from 'react-router'

import {ADMIN_ROUTE} from '../constants'

export const createPath = (match: Match, path: string): string => {
  if (path.split('')[0] === '/') {
    throw new Error(`"createPath function Error => The path passed cannot have '/' at the beginning: check ${path}`)
  }

  return `${match.url}${match.url === '/' ? '' : '/'}${path}`
}

export const getPath = (match: Match): string => {
  return match.path.includes(ADMIN_ROUTE) ? `/${ADMIN_ROUTE}` : ''
}
