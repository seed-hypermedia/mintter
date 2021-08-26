import type {EditorPlugin} from '../types'
import type {FlowContent} from '@mintter/mttast'
import {isEmbed} from '@mintter/mttast'
import {styled} from '@mintter/ui/stitches.config'
// import {lazy, Suspense, useCallback} from 'react'
import {Node} from 'slate'
// import {getPublication} from 'frontend/client/src/publications'
import {usePublication} from '@mintter/client/hooks'
import {visit} from 'unist-util-visit'
import {document} from '@mintter/mttast-builder'
import {useMemo} from 'react'
import {MINTTER_LINK_PREFIX} from '../../constants'

export const ELEMENT_EMBED = 'embed'

export const EmbedStyled = styled('q', {
  borderRadius: '$1',
  transition: 'all ease-in-out 0.1s',
  '&:hover': {
    backgroundColor: '$secondary-softer',
    cursor: 'pointer',
  },
  '&::before, &::after': {
    fontWeight: '$bold',
    fontSize: '$5',
  },
  '&::before': {
    content: '[',
  },
  '&::after': {
    content: ']',
  },
})

export const createEmbedPlugin = (): EditorPlugin => ({
  name: ELEMENT_EMBED,
  configureEditor(editor) {
    const {isVoid, isInline} = editor

    editor.isVoid = (node) => isEmbed(node) || isVoid(node)
    editor.isInline = (node) => isEmbed(node) || isInline(node)

    return editor
  },
  renderElement({attributes, children, element}) {
    if (isEmbed(element)) {
      const {data, status, error} = useEmbed(element.url || '')
      if (status == 'loading') {
        return (
          <span {...attributes}>
            <span contentEditable={false}>...</span>
            {children}
          </span>
        )
      }

      if (status == 'error') {
        console.error('Embed Error: ', error)
        return (
          <span {...attributes}>
            <span contentEditable={false}>EMBED ERROR</span>
            {children}
          </span>
        )
      }

      return (
        <EmbedStyled cite={element.url} {...attributes}>
          {/* <Suspense fallback={''}> */}
          {/* <AsyncEmbed /> */}
          <span contentEditable={false}>
            <span>{Node.string(data.statement)}</span>
          </span>
          {/* </Suspense> */}
          {children}
        </EmbedStyled>
      )
    }
  },
})

function useEmbed(url: string) {
  if (!url) {
    throw new Error(`useEmbed: "url" must be a valid URL string. got "${url}"`)
  }
  const [publicationId, blockId] = getEmbedIds(url)
  const publicationQuery = usePublication(publicationId)
  let statement = useMemo(() => {
    let temp: FlowContent
    if (publicationQuery.data.document.content) {
      visit(document(publicationQuery.data.document.content), {id: blockId}, (node) => {
        temp = node
      })
    }

    return temp
  }, [publicationQuery.data])

  return {
    ...publicationQuery,
    data: {
      ...publicationQuery.data,
      statement,
    },
  }
}

export function getEmbedIds(entry: string): [string, string] {
  if (!entry.startsWith(MINTTER_LINK_PREFIX)) {
    throw Error(`getEmbedId Error: url must start with ${MINTTER_LINK_PREFIX}. (${entry})`)
  }

  const [, ids] = entry.split(MINTTER_LINK_PREFIX)

  if (ids.length <= 2) {
    throw Error(`getEmbedId Error: url must contain a publicationId and a blockId at least. (${entry})`)
  }
  const [one, second] = ids.split('/')
  return [one, second]
}
