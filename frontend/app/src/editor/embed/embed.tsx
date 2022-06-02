import {useMainPage} from '@app/main-page-context'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {getIdsfromUrl} from '@app/utils/get-ids-from-url'
import {error} from '@app/utils/logger'
import {useBookmarksService} from '@components/bookmarks'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import type {Embed as EmbedType} from '@mintter/mttast'
import {isEmbed} from '@mintter/mttast'
import {ForwardedRef, forwardRef} from 'react'
import toast from 'react-hot-toast'
import {RenderElementProps} from 'slate-react'
import {ContextMenu} from '../context-menu'
import type {EditorPlugin} from '../types'
import {EmbedEditor} from './embed-editor'

export const ELEMENT_EMBED = 'embed'

export const Embed = forwardRef(RenderEmbed)

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
          error(
            `Embed: element does not have a url attribute: ${JSON.stringify(
              element,
            )}`,
          )
          return <span {...attributes}>error on embed{children}</span>
        }
        return (
          <Embed element={element} attributes={attributes}>
            {children}
          </Embed>
        )
      }
    },
})

type EmbedProps = Omit<RenderElementProps, 'element'> & {element: EmbedType}

function RenderEmbed(
  {element, attributes, children}: EmbedProps,
  ref: ForwardedRef<HTMLQuoteElement>,
) {
  const bookmarksService = useBookmarksService()
  const mainPageService = useMainPage()
  const [pubId, version, blockId] = getIdsfromUrl(element.url)

  function addBookmark() {
    bookmarksService.send({
      type: 'BOOKMARK.ADD',
      url: element.url,
    })
  }

  async function onCopy() {
    await copyTextToClipboard(element.url)
    toast.success('Embed Reference copied successfully', {
      position: 'top-center',
    })
  }

  function onGoToPublication() {
    mainPageService.send({
      type: 'goToPublication',
      docId: pubId,
      version,
      blockId,
    })
  }

  async function onOpenInNewWindow() {
    let path = `p/${pubId}/${version}/${blockId}`
    mainPageService.send({type: 'OPEN_WINDOW', path})
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <EmbedEditor
          attributes={attributes}
          ref={ref}
          embed={element.url}
          onClick={onOpenInNewWindow}
        >
          {children}
        </EmbedEditor>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onSelect={onCopy}>
          <Icon name="Copy" size="1" />
          <Text size="2">Copy Embed Reference</Text>
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={addBookmark}>
          <Icon name="ArrowChevronDown" size="1" />
          <Text size="2">Add to Bookmarks</Text>
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={onGoToPublication}>
          <Icon name="ArrowTopRight" size="1" />
          <Text size="2">Open Embed in main Panel</Text>
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={onOpenInNewWindow}>
          <Icon name="OpenInNewWindow" size="1" />
          <Text size="2">Open Embed in new Window</Text>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}
