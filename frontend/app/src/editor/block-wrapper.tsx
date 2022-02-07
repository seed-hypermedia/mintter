import {createDraft} from '@app/client'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {BlockTools} from '@app/editor/block-tools'
import {Dropdown} from '@app/editor/dropdown'
import {useHoverBlockId} from '@app/editor/hover-context'
import {EditorMode} from '@app/editor/plugin-utils'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useRoute} from '@app/utils/use-route'
import {bookmarksModel, useBookmarksService} from '@components/bookmarks'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {sidepanelModel, useSidepanel} from '@components/sidepanel'
import {Text} from '@components/text'
import {FlowContent} from '@mintter/mttast'
import toast from 'react-hot-toast'
import {RenderElementProps} from 'slate-react'
import {useLocation} from 'wouter'

export function BlockWrapper({
  element,
  children,
  mode,
}: RenderElementProps & {
  mode: EditorMode
}) {
  const bookmarksService = useBookmarksService()
  const sidepanelService = useSidepanel()
  const hoverId = useHoverBlockId()
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

  function addBookmark(docId: string, version: string, blockId: FlowContent['id']) {
    bookmarksService.send(bookmarksModel.events['BOOKMARK.ADD'](`${MINTTER_LINK_PREFIX}${docId}/${version}/${blockId}`))
  }

  async function onStartDraft() {
    try {
      const newDraft = await createDraft()
      if (newDraft) {
        onSidepanel()
        setLocation(`/editor/${newDraft.id}`)
      }
    } catch (err) {
      throw Error('new Draft error: ')
    }
  }

  function onSidepanel() {
    sidepanelService.send(
      sidepanelModel.events['SIDEPANEL.ADD']({
        type: 'block',
        //@ts-ignore
        url: `mtt://${params?.docId}/${params?.version}/${element.id}`,
      }),
    )
    sidepanelService.send('SIDEPANEL.OPEN')
  }

  return mode == EditorMode.Draft ? (
    <>
      <BlockTools element={element} />
      {children}
    </>
  ) : (
    <>
      <Dropdown.Root modal={false}>
        <Dropdown.Trigger asChild>
          <Button
            variant="ghost"
            size="1"
            color="muted"
            css={{
              opacity: hoverId == (element as FlowContent).id ? 1 : 0,
              padding: '$1',
              backgroundColor: '$background-alt',
              position: 'absolute',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              right: 4,
              top: 4,
            }}
          >
            <Icon name="MoreHorizontal" size="1" color="muted" />
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Content alignOffset={-5} align="end">
          <Dropdown.Item onSelect={onCopy}>
            <Icon name="Copy" size="1" />
            <Text size="2">Copy Block ID</Text>
          </Dropdown.Item>
          <Dropdown.Item
            onSelect={() => {
              //@ts-ignore
              addBookmark(params!.docId, params?.version, element.id)
            }}
          >
            <Icon size="1" name="ArrowBottomRight" />
            <Text size="2">Add to Bookmarks</Text>
          </Dropdown.Item>
          <Dropdown.Item onSelect={onSidepanel}>
            <Icon size="1" name="ArrowTopRight" />
            <Text size="2">Add to Sidepanel</Text>
          </Dropdown.Item>
          <Dropdown.Item onSelect={onStartDraft}>
            <Icon size="1" name="AddCircle" />
            <Text size="2">Start a Draft</Text>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
      {children}
    </>
  )
}
