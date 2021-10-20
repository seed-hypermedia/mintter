import {FlowContent} from '@mintter/mttast'
import {document} from '@mintter/mttast-builder'
import {useMemo} from 'react'
import {visit} from 'unist-util-visit'
import {usePublication} from '../../hooks'
import {getEmbedIds} from './get-embed-ids'

export function useEmbed(url: string) {
  if (!url) {
    throw new Error(`useEmbed: "url" must be a valid URL string. got "${url}"`)
  }
  const [publicationId, blockId] = getEmbedIds(url)
  const publicationQuery = usePublication(publicationId)
  let statement = useMemo(() => {
    let temp: FlowContent = []
    if (publicationQuery.data.document.content) {
      visit(document(publicationQuery.data.document.content), {id: blockId}, (node) => {
        temp = node
      })
    }

    return temp
  }, [publicationQuery, blockId])

  return {
    ...publicationQuery,
    data: {
      ...publicationQuery.data,
      statement,
    },
  }
}
