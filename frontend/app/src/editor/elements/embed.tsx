import {usePublication} from '@mintter/client/hooks'
import type {Embed, FlowContent} from '@mintter/mttast'
import {isEmbed} from '@mintter/mttast'
import {document} from '@mintter/mttast-builder'
import {Icon} from '@mintter/ui/icon'
import {styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {forwardRef, useMemo} from 'react'
import toast from 'react-hot-toast'
import {Node} from 'slate'
import {visit} from 'unist-util-visit'
import {useLocation} from 'wouter'
import {useSidepanel} from '../../components/sidepanel'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {ContextMenu} from '../context-menu'
import type {EditorPlugin} from '../types'
import {copyTextToClipboard} from './statement'

export const ELEMENT_EMBED = 'embed'

export const EmbedStyled = styled('q', {
  borderRadius: '$1',
  transition: 'all ease-in-out 0.1s',
  backgroundColor: '$background-alt',
  '&:hover': {
    backgroundColor: '$secondary-softer',
    cursor: 'pointer',
    // color: '$text-contrast',
  },
  '&::before, &::after': {
    fontWeight: '$bold',
    fontSize: '$5',
    color: '$text-alt',
    // backgroundColor: '$background-alt',
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
      return (
        <InlineEmbed embed={element} {...attributes}>
          {children}
        </InlineEmbed>
      )
    }
  },
})

/*
 * @todo InlineEmbed ref type
 */
export const InlineEmbed = forwardRef<HTMLSpanElement | HTMLQuoteElement, {embed: Embed}>(
  ({embed, children = null, ...props}, ref) => {
    const {data, status, error} = useEmbed(embed.url)
    const {send} = useSidepanel()
    const [, setLocation] = useLocation()
    // const {statement: hoverEmbed} = useHoverEvent(ref, embed.url)

    async function onCopy() {
      await copyTextToClipboard(embed.url)
      toast.success('Embed Reference copied successfully', {position: 'top-center'})
    }

    function onGoToPublication(url: string) {
      const [publicationId] = getEmbedIds(url)
      setLocation(`/p/${publicationId}`)
    }

    if (status == 'loading') {
      return (
        <span {...props} contentEditable={false}>
          ...
          {children}
        </span>
      )
    }

    if (status == 'error') {
      console.error('Embed Error: ', error)
      return (
        <span contentEditable={false} {...props}>
          EMBED ERROR
          {children}
        </span>
      )
    }
    return (
      <EmbedStyled
        ref={ref}
        cite={embed.url}
        // css={{
        //   backgroundColor: (focused && selected) || hoverEmbed == embed.url ? '$secondary-softer' : '$background-alt',
        // }}
        {...props}
      >
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <Text css={{display: 'inline'}} alt contentEditable={false} size="4">
              {data.statement.children[0].children.map((child, idx) =>
                isEmbed(child) ? (
                  <InlineEmbed key={`${child.url}-${idx}`} embed={child} />
                ) : (
                  <span key={`${child.type}-${idx}`}>{Node.string(child)}</span>
                ),
              )}
            </Text>
            {children}
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item onSelect={() => onGoToPublication(embed.url)}>
              <Icon name="ArrowTopRight" size="1" />
              <Text size="2">Open in main Panel</Text>
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={onCopy}>
              <Icon name="Copy" size="1" />
              <Text size="2">Copy Embed Reference</Text>
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={() => send({type: 'SIDEPANEL_ADD_ITEM', payload: embed.url})}>
              <Icon name="ArrowChevronDown" size="1" />
              <Text size="2">Add to Bookmarks</Text>
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
      </EmbedStyled>
    )
  },
)

InlineEmbed.displayName = 'InlineEmbed'

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
