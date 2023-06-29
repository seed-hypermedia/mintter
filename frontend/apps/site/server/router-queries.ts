import {useRouter} from 'next/router'

export function useRouteQuery(key: string): string | undefined {
  const {query} = useRouter()
  const value = query[key]
  if (!value) return undefined
  if (Array.isArray(value)) return value.join(',')
  return value
}

export function useRequiredRouteQuery(key: string): string {
  const value = useRouteQuery(key)
  if (!value) throw new Error(`Missing required query param: ${key}`)
  return value
}
