import {useInfo} from '@mintter/client/hooks'
import type {Info} from 'frontend/client/.generated/daemon/v1alpha/daemon'
import {useQueryClient} from 'react-query'
import {match as Match, Redirect, Route} from 'react-router'

import {ADMIN_ROUTE} from '../constants'

export const createPath = (url: string, path: string): string => {
  if (path.split('')[0] == '/') {
    throw new Error(`"createPath function Error => The path passed cannot have '/' at the beginning: check ${path}`)
  }

  return `${url}${url === '/' ? '' : '/'}${path}`
}

export const getPath = (path: string): string => {
  return path.includes(ADMIN_ROUTE) ? `/${ADMIN_ROUTE}` : ''
}
