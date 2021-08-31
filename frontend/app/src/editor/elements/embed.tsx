import type {EditorPlugin} from '../types'
import type {FlowContent} from '@mintter/mttast'
import {isEmbed} from '@mintter/mttast'
import {css, styled} from '@mintter/ui/stitches.config'
// import {lazy, Suspense, useCallback} from 'react'
import {Node} from 'slate'
// import {getPublication} from 'frontend/client/src/publications'
import {usePublication} from '@mintter/client/hooks'
import {visit} from 'unist-util-visit'
import {document} from '@mintter/mttast-builder'
import {useMemo} from 'react'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {ContextMenu} from '../context-menu'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {copyTextToClipboard} from './statement'
import toast from 'react-hot-toast'
import {useFocused, useSelected} from 'slate-react'
import {useSidepanel} from '../../components/sidepanel'
import {InlineEditor} from '../inline-editor'

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
      if (!element.url) {
        console.error(`Embed: element does not have a url attribute: ${JSON.stringify(element)}`)
        return <span {...attributes}>error on embed{children}</span>
      }
      const {data, status, error} = useEmbed(element.url)
      console.log('🚀 ~ file: embed.tsx ~ line 60 ~ renderElement ~ data', data)
      const selected = useSelected()
      const focused = useFocused()
      const {send} = useSidepanel()

      async function onCopy() {
        await copyTextToClipboard(element.url!)
        toast.success('Embed Reference copied successfully', {position: 'top-center'})
      }

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
        <EmbedStyled
          cite={element.url}
          {...attributes}
          css={{
            backgroundColor: focused && selected ? '$secondary-softer' : 'transparent',
          }}
        >
          <ContextMenu.Root>
            <ContextMenu.Trigger>
              <span contentEditable={false}>
                <InlineEditor document={data.document} statement={data.statement} />
                {/* <span>{Node.string(data.statement)}</span> */}
              </span>
              {children}
            </ContextMenu.Trigger>
            <ContextMenu.Content>
              <ContextMenu.Item onSelect={onCopy}>
                <Icon name="Copy" size="1" />
                <Text size="2">Copy Embed Reference</Text>
              </ContextMenu.Item>
              <ContextMenu.Item onSelect={() => send({type: 'SIDEPANEL_ADD_ITEM', payload: element.url!})}>
                <Icon name="Copy" size="1" />
                <Text size="2">Open in Sidepanel</Text>
              </ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu.Root>
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
