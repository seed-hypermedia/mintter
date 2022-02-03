import {createDraft} from '@app/client'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {ContextMenu} from '@app/editor/context-menu'
import {EditorMode} from '@app/editor/plugin-utils'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useRoute} from '@app/utils/use-route'
import {bookmarksModel, useBookmarksService} from '@components/bookmarks'
import {Icon} from '@components/icon'
import {sidepanelModel, useSidepanel} from '@components/sidepanel'
import {Text} from '@components/text'
import {FlowContent} from '@mintter/mttast'
import toast from 'react-hot-toast'
import {RenderElementProps} from 'slate-react'
import {useLocation} from 'wouter'

export function BlockWrapper({
  element,
  attributes,
  children,
  mode,
}: RenderElementProps & {
  mode: EditorMode
}) {
  const bookmarksService = useBookmarksService()
  const sidepanelService = useSidepanel()
  const {params} = useRoute<{docId: string; version: string; blockId?: string}>([
    '/p/:docId/:version/:blockId?',
    '/editor/:docId',
  ])
  const [, setLocation] = useLocation()

  async function onCopy() {
    if (params) {
      //@ts-ignore
      await copyTextToClipboard(`${MINTTER_LINK_PREFIX}${params.docId}/${params.version}/${element.id}`)
      toast.success('Statement Reference copied successfully', {position: 'top-center'})
    } else {
      toast.error('Cannot Copy Block ID')
    }
  }

  function addBookmark(docId: string, blockId: FlowContent['id']) {
    bookmarksService.send(bookmarksModel.events['ADD.BOOKMARK'](`${MINTTER_LINK_PREFIX}${docId}/${blockId}`))
  }
  async function onStartDraft() {
    try {
      const newDraft = await createDraft()
      if (newDraft) {
        setLocation(`/editor/${newDraft.id}`)
      }
    } catch (err) {
      throw Error('new Draft error: ')
    }
  }

  return mode == EditorMode.Draft ? (
    children
  ) : (
    <ContextMenu.Root modal={false}>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Content alignOffset={-5}>
        <ContextMenu.Item onSelect={onCopy}>
          <Icon name="Copy" size="1" />
          <Text size="2">Copy Block ID</Text>
        </ContextMenu.Item>
        <ContextMenu.Item
          onSelect={() => {
            //@ts-ignore
            addBookmark(params!.docId, element.id)
            sidepanelService.send('SIDEPANEL.OPEN')
          }}
        >
          <Icon size="1" name="ArrowBottomRight" />
          <Text size="2">Add to Bookmarks</Text>
        </ContextMenu.Item>
        <ContextMenu.Item
          onSelect={() => {
            sidepanelService.send(
              sidepanelModel.events['SIDEPANEL.ADD']({
                type: 'block',
                //@ts-ignore
                url: `mtt://${params?.docId}/${params?.version}/${element.id}`,
              }),
            )
            sidepanelService.send('SIDEPANEL.OPEN')
          }}
        >
          <Icon size="1" name="ArrowTopRight" />
          <Text size="2">Add to Sidepanel</Text>
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={onStartDraft}>
          <Icon size="1" name="AddCircle" />
          <Text size="2">Start a Draft</Text>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}
