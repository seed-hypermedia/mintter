import {mainService as defaultMainService} from '@app/app-providers'
import {deleteFileMachine} from '@app/delete-machine'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {getIdsfromUrl} from '@app/utils/get-ids-from-url'
import {createBookmarkMachine, useBookmarksService} from '@components/bookmarks'
import {DeleteDialog} from '@components/delete-dialog'
import {Icon} from '@components/icon'
import {StyledItem} from '@components/library/library-item'
import {Text} from '@components/text'
import {FlowContent} from '@mintter/mttast'
import {useActor, useInterpret} from '@xstate/react'
import toast from 'react-hot-toast'
import {visit} from 'unist-util-visit'
import {ActorRefFrom} from 'xstate'

export function BookmarkItem({
  itemRef,
  mainService = defaultMainService,
}: {
  itemRef: ActorRefFrom<ReturnType<typeof createBookmarkMachine>>
  mainService?: typeof defaultMainService
}) {
  const [state] = useActor(itemRef)
  const bookmarks = useBookmarksService()

  const deleteService = useInterpret(() => deleteFileMachine, {
    actions: {
      removeFileFromBookmarks: (context) => {
        bookmarks.send({
          type: 'BOOKMARK.FILE.DELETE',
          documentId: context.documentId,
          version: context.version,
        })
      },
      persistDelete: (context) => {
        bookmarks.send({
          type: 'BOOKMARK.REMOVE',
          url: state.context.url,
        })
      },
    },
    services: {
      performDelete: async () => {
        // we are not dealing with any API for bookmarks (yet)
        return await Promise.resolve({})
      },
    },
  })

  const [deleteState] = useActor(deleteService)

  async function onCopy() {
    await copyTextToClipboard(state.context.url)
    toast.success('ID copied successfully', {position: 'top-center'})
  }

  function onMainPanel() {
    let [docId, version, blockId] = getIdsfromUrl(state.context.url)
    mainService.send({
      type: 'GO.TO.PUBLICATION',
      docId,
      version,
      blockId,
    })
  }

  return (
    <StyledItem data-testid="bookmark-item">
      <Text
        size="2"
        className="title"
        onClick={onMainPanel}
        data-testid="bookmark-item-title"
        css={{flex: 1}}
      >
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
                backgroundColor: '$base-background-subtle',
              },
            }}
          >
            <Icon name="MoreHorizontal" size="1" color="muted" />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Content
          align="start"
          data-testid="bookmark-item-dropdown-root"
          hidden={deleteState.matches('open')}
        >
          <Dropdown.Item onSelect={onCopy}>
            <Icon name="Copy" size="1" />
            <Text size="2">Copy Document ID</Text>
          </Dropdown.Item>
          <Dropdown.Item onSelect={onMainPanel}>
            <Icon size="1" name="ArrowTopRight" />
            <Text size="2">Open in main panel</Text>
          </Dropdown.Item>
          <DeleteDialog
            deleteRef={deleteService}
            title="Delete Bookmark"
            description="Are you sure you want to delete this bookmark? This action is not reversible."
          >
            <Dropdown.Item
              data-testid="delete-item"
              onSelect={(e) => e.preventDefault()}
            >
              <Icon size="1" name="Close" />
              <Text size="2">Delete bookmark</Text>
            </Dropdown.Item>
          </DeleteDialog>
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
