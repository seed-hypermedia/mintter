import type {Embed as EmbedType} from '@mintter/mttast'
import {FlowContent, isEmbed} from '@mintter/mttast'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {useActor} from '@xstate/react'
import {PropsWithChildren} from 'react'
import toast from 'react-hot-toast'
import {useLocation} from 'wouter'
import {useBookmarksService} from '../../components/bookmarks'
import {useSidepanel} from '../../components/sidepanel'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {ContextMenu} from '../context-menu'
import {copyTextToClipboard} from '../statement'
import type {EditorPlugin} from '../types'
import {EmbedEditor} from './embed-editor'
import {getEmbedIds} from './get-embed-ids'

export const ELEMENT_EMBED = 'embed'

export const Embed = ({embed, children = null, ...props}: PropsWithChildren<{embed: EmbedType}>) => {
  const sidepanelService = useSidepanel()
  const [, sidepanelSend] = useActor(sidepanelService)
  const bookmarkService = useBookmarksService()
  const [, bookmarkSend] = useActor(bookmarkService)
  const [, setLocation] = useLocation()
  const [docId, blockId] = getEmbedIds(embed.url)

  function addBookmark(docId: string, blockId: FlowContent['id']) {
    bookmarkSend({
      type: 'ADD_BOOKMARK',
      link: `${MINTTER_LINK_PREFIX}${docId}/${blockId}`,
    })
  }

  async function onCopy() {
    await copyTextToClipboard(embed.url)
    toast.success('Embed Reference copied successfully', {position: 'top-center'})
  }

  function onGoToPublication(url: string) {
    const [publicationId] = getEmbedIds(url)
    setLocation(`/p/${publicationId}`)
  }

  function onOpenInSidepanel() {
    sidepanelSend('SIDEPANEL_OPEN')
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <EmbedEditor embed={embed.url} {...props} onClick={onOpenInSidepanel}>
          {children}
        </EmbedEditor>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onSelect={onOpenInSidepanel}>
          <Icon name="Sidepanel" size="1" />
          <Text size="2">Open Embed in Sidepanel</Text>
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={() => onGoToPublication(embed.url)}>
          <Icon name="ArrowTopRight" size="1" />
          <Text size="2">Open Embed in main Panel</Text>
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={onCopy}>
          <Icon name="Copy" size="1" />
          <Text size="2">Copy Embed Reference</Text>
        </ContextMenu.Item>
        <ContextMenu.Item
          onSelect={() => {
            addBookmark(docId, blockId)
          }}
        >
          <Icon name="ArrowChevronDown" size="1" />
          <Text size="2">Add to Bookmarks</Text>
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
