import type {NavRoute} from './navigation'
import {Buffer} from 'buffer'

export function encodeRouteToPath(route: NavRoute): string {
  return `/${Buffer.from(JSON.stringify(route))
    .toString('base64')
    .replaceAll('=', '-')
    .replaceAll('+', '_')}`
}

export function decodeRouteFromPath(initRoute: string): NavRoute {
  return JSON.parse(
    Buffer.from(
      initRoute.replaceAll('_', '+').replaceAll('-', '='),
      'base64',
    ).toString('utf8'),
  )
}
