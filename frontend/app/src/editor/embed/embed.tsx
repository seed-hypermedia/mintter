import type {Embed as EmbedType} from '@mintter/mttast'
import {isEmbed} from '@mintter/mttast'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {EmbedEditor} from 'frontend/app/src/editor/embed'
import {PropsWithChildren} from 'react'
import toast from 'react-hot-toast'
import {useLocation} from 'wouter'
import {ContextMenu} from '../context-menu'
import {copyTextToClipboard} from '../statement'
import type {EditorPlugin} from '../types'
import {getEmbedIds} from './get-embed-ids'

export const ELEMENT_EMBED = 'embed'

export const createEmbedPlugin = (): EditorPlugin => ({
  name: ELEMENT_EMBED,
  configureEditor(editor) {
    const {isVoid, isInline} = editor

    editor.isVoid = (node) => isEmbed(node) || isVoid(node)
    editor.isInline = (node) => isEmbed(node) || isInline(node)

    return editor
  },
  renderElement:
    () =>
    ({attributes, children, element}) => {
      if (isEmbed(element)) {
        if (!element.url) {
          console.error(`Embed: element does not have a url attribute: ${JSON.stringify(element)}`)
          return <span {...attributes}>error on embed{children}</span>
        }
        return (
          <>
            <Embed embed={element} {...attributes}>
              {children}
            </Embed>
          </>
        )
      }
    },
})

export function Embed({embed, children = null, ...props}: PropsWithChildren<{embed: EmbedType}>) {
  // const {send} = useSidepanel()
  const [, setLocation] = useLocation()

  async function onCopy() {
    await copyTextToClipboard(embed.url)
    toast.success('Embed Reference copied successfully', {position: 'top-center'})
  }

  function onGoToPublication(url: string) {
    const [publicationId] = getEmbedIds(url)
    setLocation(`/p/${publicationId}`)
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <EmbedEditor embed={embed.url} {...props}>
          {/* <Text css={{display: 'inline'}} alt contentEditable={false} size="4">
              {data.statement.children[0].children.map((child, idx) =>
                isEmbed(child) ? (
                  <InlineEmbed key={`${child.url}-${idx}`} embed={child} />
                ) : (
                  <span key={`${child.type}-${idx}`}>{Node.string(child)}</span>
                ),
              )}
            </Text> */}
          {children}
        </EmbedEditor>
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
        {/* <ContextMenu.Item onSelect={() => send({type: 'SIDEPANEL_ADD_ITEM', payload: embed.url})}>
          <Icon name="ArrowChevronDown" size="1" />
          <Text size="2">Add to Bookmarks</Text>
        </ContextMenu.Item> */}
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}
