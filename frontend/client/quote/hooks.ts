import { Block } from '@mintter/api/documents/v1alpha/documents'
import { UseQueryOptions, useQuery } from 'react-query'
import { useMemo } from 'react'
import { mockBlock, mockTextInlineElement } from '../mock'

export type UseQuoteOptions = UseQueryOptions<Block, unknown, Block>

export function useQuote(url: string, options: UseQuoteOptions = {}) {
  const [, blockId] = url.split('/')

  const quoteQuery = useQuery(
    ['Quote', blockId],
    async () => {
      console.warn('called mocked function "useQuote"');
      const block = mockBlock({
        id: blockId,
        elements: [
          mockTextInlineElement({
            text: `${blockId}: dummy quote text`,
            linkKey: '',
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            blockquote: false,
            code: false
          })
        ]
      })
      return block
    },
    {
      enabled: !!blockId
    }
  )

  const data = useMemo(() => quoteQuery.data, [quoteQuery.data])

  return {
    ...quoteQuery,
    data
  }
}