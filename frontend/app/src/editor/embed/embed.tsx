import {MINTTER_LINK_PREFIX} from '@app/constants'
import {useBookmarksService} from '@components/bookmarks'
import {Icon} from '@components/icon'
import {useSidepanel} from '@components/sidepanel'
import {Text} from '@components/text'
import type {Embed as EmbedType} from '@mintter/mttast'
import {FlowContent, isEmbed} from '@mintter/mttast'
import {PropsWithChildren} from 'react'
import toast from 'react-hot-toast'
import {useLocation} from 'wouter'
import {ContextMenu} from '../context-menu'
import {copyTextToClipboard} from '../statement'
import type {EditorPlugin} from '../types'
import {EmbedEditor} from './embed-editor'
import {getEmbedIds} from './get-embed-ids'

export const ELEMENT_EMBED = 'embed'

export const Embed = ({embed, children = null, ...props}: PropsWithChildren<{embed: EmbedType}>) => {
  const sidepanelService = useSidepanel()
  const bookmarksService = useBookmarksService()
  const [, setLocation] = useLocation()
  const [docId, version, blockId] = getEmbedIds(embed.url)

  function addBookmark(docId: string, blockId: FlowContent['id']) {
    bookmarksService.send({
      type: 'ADD.BOOKMARK',
      link: `${MINTTER_LINK_PREFIX}${docId}/${version}/${blockId}`,
    })
  }

  async function onCopy() {
    await copyTextToClipboard(embed.url)
    toast.success('Embed Reference copied successfully', {position: 'top-center'})
  }

  function onGoToPublication(url: string) {
    const [publicationId, version] = getEmbedIds(url)
    setLocation(`/p/${publicationId}/${version}`)
  }

  function onOpenInSidepanel() {
    sidepanelService.send('SIDEPANEL_OPEN')
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <EmbedEditor embed={embed.url} {...props} onClick={onOpenInSidepanel}>
          {children}
        </EmbedEditor>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onSelect={onCopy}>
          <Icon name="Copy" size="1" />
          <Text size="2">Copy Embed Reference</Text>
        </ContextMenu.Item>
        <ContextMenu.Item
          onSelect={() => {
            addBookmark(docId, blockId)
            sidepanelService.send('SIDEPANEL_OPEN')
          }}
        >
          <Icon name="ArrowChevronDown" size="1" />
          <Text size="2">Add to Bookmarks</Text>
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={() => onGoToPublication(embed.url)}>
          <Icon name="ArrowTopRight" size="1" />
          <Text size="2">Open Embed in main Panel</Text>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}

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
