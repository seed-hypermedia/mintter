import { Document } from '@mintter/api/documents/v1alpha/documents'
import { useMemo } from 'react'
import { UseQueryOptions, useQuery } from 'react-query'
import { getDraft } from './lib'

export type UseDraftOptions = UseQueryOptions<Document, unknown, Document>

/**
 * 
 * @param draftId 
 * @param options 
 * @returns 
 */
export function useDraft(draftId: string, options: UseDraftOptions = {}) {
  const draftQuery = useQuery(
    ['Draft', draftId],
    async ({ queryKey }) => {
      const [_key, draftId] = queryKey as [string, string]
      return getDraft(draftId)
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  )

  const data = useMemo(() => draftQuery.data, [draftQuery.data])

  return {
    ...draftQuery,
    data
  }
}

/**
 *
 * @deprecated
 */
export function useDraftsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
  };
}