import {usePublication} from '@app/hooks'
import {FlowContent} from '@mintter/mttast'
import {useMemo} from 'react'
import {visit} from 'unist-util-visit'
import {getEmbedIds} from './get-embed-ids'

export function useEmbed(url: string) {
  if (!url) {
    throw new Error(`useEmbed: "url" must be a valid URL string. got "${url}"`)
  }
  const [publicationId, version, blockId] = getEmbedIds(url)
  const publicationQuery = usePublication(publicationId)
  let statement = useMemo(() => {
    let temp: FlowContent
    if (publicationQuery.data.document.content) {
      visit(publicationQuery.data.document.content[0], {id: blockId}, (node) => {
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
