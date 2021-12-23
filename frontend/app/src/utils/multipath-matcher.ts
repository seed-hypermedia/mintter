import type {DefaultParams} from 'wouter'
import makeMatcher from 'wouter/matcher'

const defaultMatcher = makeMatcher()

/*
 * A custom routing matcher function that supports multipath routes
 */
export function multipathMatcher<T = DefaultParams>(
  patterns: Array<string> | string,
  path: string,
): [boolean, T | null] {
  for (let pattern of [patterns].flat()) {
    const [match, params] = defaultMatcher(pattern, path)

    if (match) return [match, params]
  }

  return [false, null]
}
