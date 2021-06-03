import { Document } from '@mintter/api/documents/v1alpha/documents'
import { useMemo } from 'react'
import { UseQueryOptions, useQuery } from 'react-query'
import { getDocument } from './lib'

export type UseDocumentOptions = UseQueryOptions<Document, unknown, Document>

/**
 * 
 * @param documentId 
 * @param options 
 * @returns 
 */
export function useDocument(documentId: string, options: UseDocumentOptions = {}) {
  const documentQuery = useQuery<Document>(
    ['Document', documentId],
    () => getDocument(documentId),
    {
      enabled: !!documentId,
    },
  )

  const data = useMemo(() => documentQuery.data, [documentQuery.data])

  return {
    ...documentQuery,
    data,
  }
}