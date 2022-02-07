import {FlowContent} from '@app/../../mttast/dist'
import {createDraft} from '@app/client'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {bookmarksModel, createBookmarkMachine, useBookmarksService} from '@components/bookmarks'
import {DeleteDialog} from '@components/delete-dialog'
import {Icon} from '@components/icon'
import {StyledItem} from '@components/library/library-item'
import {sidepanelModel, useSidepanel} from '@components/sidepanel'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'
import toast from 'react-hot-toast'
import {visit} from 'unist-util-visit'
import {useLocation} from 'wouter'
import {ActorRefFrom} from 'xstate'

export function BookmarkItem({itemRef}: {itemRef: ActorRefFrom<ReturnType<typeof createBookmarkMachine>>}) {
  const sidepanelService = useSidepanel()
  const [state, send] = useActor(itemRef)
  const bookmarks = useBookmarksService()
  const [, setLocation] = useLocation()
  console.log('bookmark state: ', state)

  async function onCopy() {
    await copyTextToClipboard(state.context.url)
    toast.success('Bookmark ID copied successfully', {position: 'top-center'})
  }

  function onMainPanel() {
    let link = state.context.url.replace(MINTTER_LINK_PREFIX, '')
    setLocation(`/p/${link}`)
  }

  function onSidePanel() {
    sidepanelService.send(
      sidepanelModel.events['SIDEPANEL.ADD']({
        type: 'block',
        url: state.context.url,
      }),
    )
    sidepanelService.send('SIDEPANEL.OPEN')
  }

  function afterDelete() {
    console.log('delete success')
  }

  async function onStartDraft() {
    // info('onStartDraft: TBD')
    try {
      const newDraft = await createDraft()
      if (newDraft) {
        onSidePanel()
        setLocation(`/editor/${newDraft.id}`)
      }
    } catch (err) {
      throw Error('new Draft error: ')
    }
  }

  return (
    <StyledItem data-testid="bookmark-item">
      <Text size="2" className="title">
        {state.context.publication?.document.title
          ? state.context.publication?.document.title
          : state.context.block
          ? toString(state.context.block)
          : 'Untitled bookmark'}
      </Text>
      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <ElementDropdown
            data-trigger
            className="dropdown"
            css={{
              backgroundColor: 'transparent',
              '&:hover': {
                color: 'inherit',
                backgroundColor: '$background-alt',
              },
            }}
          >
            <Icon name="MoreHorizontal" size="1" color="muted" />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Content align="start" data-testid="bookmark-item-dropdown-root">
          <Dropdown.Item onSelect={onCopy}>
            <Icon name="Copy" size="1" />
            <Text size="2">Copy Bookmark ID</Text>
          </Dropdown.Item>
          <Dropdown.Item onSelect={onMainPanel}>
            <Icon size="1" name="ArrowTopRight" />
            <Text size="2">Open in main panel</Text>
          </Dropdown.Item>
          <Dropdown.Item onSelect={onSidePanel}>
            <Icon size="1" name="ArrowBottomRight" />
            <Text size="2">Open in sidepanel</Text>
          </Dropdown.Item>
          <DeleteDialog
            entryId={state.context.url}
            handleDelete={() => {
              bookmarks.send(bookmarksModel.events['BOOKMARK.REMOVE'](state.context.url))
            }}
            onSuccess={afterDelete}
            title="Delete Bookmark"
            description="Are you sure you want to delete this bookmark? This action is not reversible."
          >
            <Dropdown.Item data-testid="delete-item" onSelect={(e) => e.preventDefault()}>
              <Icon size="1" name="Close" />
              <Text size="2">Delete bookmark</Text>
            </Dropdown.Item>
          </DeleteDialog>
          <Dropdown.Item onSelect={onStartDraft}>
            <Icon size="1" name="AddCircle" />
            <Text size="2">Start a Draft</Text>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </StyledItem>
  )
}

function toString(node: FlowContent): string {
  let result = ''

  visit(node, 'text', extractText)

  function extractText(node: any) {
    result += node.value
  }

  return result
}
