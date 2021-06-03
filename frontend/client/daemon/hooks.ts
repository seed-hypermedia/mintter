import { Info } from '@mintter/api/daemon/v1alpha/daemon'
import { UseQueryOptions, useQuery } from 'react-query'
import { useMemo } from 'react'
import { getInfo } from './lib'

export type UseInfoOptions = UseQueryOptions<Info, unknown, Info>

export function useInfo(options: UseInfoOptions = {}) {
  const infoQuery = useQuery(['GetInfo'], getInfo, options)

  const data = useMemo(() => infoQuery.data, [infoQuery.data])

  return {
    ...infoQuery,
    data
  }
}