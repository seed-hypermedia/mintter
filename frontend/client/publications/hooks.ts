import { Publication } from "@mintter/api/documents/v1alpha/documents";
import { UseQueryOptions, useQuery } from 'react-query'
import { useMemo } from 'react'
import { getPublication } from "./lib";

export type UsePublicationOptions = UseQueryOptions<Publication, unknown, Publication>

export function usePublication(publicationId: string, version?: string, options: UsePublicationOptions = {}) {
  const publicationQuery = useQuery(
    ['Publication', publicationId, version],
    async ({ queryKey }) => {
      const [_key, publicationId, version] = queryKey as [string, string, string]
      return getPublication(publicationId, version)
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  )

  const data = useMemo(() => publicationQuery.data, [publicationQuery.data])

  return {
    ...publicationQuery,
    data
  }
}

/**
 *
 * @deprecated
 */
export function useOthersPublicationsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
  };
}

/**
 *
 * @deprecated
 */
export function useMyPublicationsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
  };
}
