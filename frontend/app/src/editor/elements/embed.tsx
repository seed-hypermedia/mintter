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
      //eslint-disable-next-line react-hooks/rules-of-hooks
      // const AsyncEmbed = useCallback(
      //   lazy(async () => {
      //     const {document} = await getPublication(element.url || '')
      //     const data = JSON.parse(document?.content || '')
      //     return {
      //       default: function AsyncEmbed() {
      //         return (
      //           <span contentEditable={false}>
      //             <span>{Node.string(data)}</span>
      //           </span>
      //         )
      //       },
      //     }
      //   }),
      //   [element.url],
      // )

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
  const [publicationId, blockId] = url.split('/')
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
