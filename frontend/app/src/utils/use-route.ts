import {DefaultParams, useLocation} from 'wouter'
import {multipathMatcher} from './multipath-matcher'

export type UseRouteReturn<T = DefaultParams> = {
  match: boolean
  params: T | null
}

export function useRoute<T = DefaultParams>(patterns: Array<string> | string): UseRouteReturn<T> {
  const [path] = useLocation()
  const [match, params] = multipathMatcher<T>(patterns, path)

  return {match, params}
}
