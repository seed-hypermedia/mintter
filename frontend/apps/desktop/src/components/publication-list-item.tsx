import {Dropdown, MenuItem} from '@app/editor/dropdown'
import {prefetchPublication, useDeletePublication} from '@app/models/documents'
import {usePopoverState} from '@app/use-popover-state'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {PublicationRoute, useNavigate} from '@app/utils/navigation'
import {
  Document,
  formattedDate,
  MINTTER_LINK_PREFIX,
  Publication,
} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Copy,
  Delete,
  ExternalLink,
  MoreHorizontal,
  Popover,
  Separator,
  Text,
  XStack,
  YGroup,
} from '@mintter/ui'
import {MouseEvent} from 'react'
import {toast} from 'react-hot-toast'
import {AccountLinkAvatar} from './account-link-avatar'
import {DeleteDialog} from './delete-dialog'

export function PublicationListItem({
  publication,
  hasDraft,
  copy = copyTextToClipboard,
}: {
  publication: Publication
  copy?: typeof copyTextToClipboard
  hasDraft: Document | undefined
}) {
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  const title = publication.document?.title || 'Untitled Document'
  const docId = publication.document?.id
  const popoverState = usePopoverState()
  const dialogState = usePopoverState()
  const deletePub = useDeletePublication({
    onSuccess: () => {
      dialogState.onOpenChange(false)
    },
  })
  if (!docId) throw new Error('PublicationListItem requires id')

  function goToItem(event: MouseEvent) {
    event.preventDefault()
    const route: PublicationRoute = {
      key: 'publication',
      documentId: docId!,
      versionId: publication.version,
    }
    if (event.metaKey || event.shiftKey) {
      spawn(route)
    } else {
      navigate(route)
    }
  }

  function onCopy() {
    copy(
      `${MINTTER_LINK_PREFIX}${publication.document?.id}/${publication.version}`,
    )
    toast.success('Document ID copied successfully')
  }
  return (
    <Button
      chromeless
      tag="li"
      onMouseEnter={() => {
        if (publication.document)
          prefetchPublication(publication.document.id, publication.version)
      }}
    >
      {/* @ts-ignore */}
      <ButtonText onPress={goToItem} fontWeight="700" flex={1}>
        {title}
      </ButtonText>

      {hasDraft && (
        <Button
          theme="yellow"
          zIndex="$max"
          onPress={(e) => {
            e.preventDefault()
            e.stopPropagation()
            navigate({
              key: 'draft',
              draftId: hasDraft.id,
              contextDocumentId: publication.document?.id,
            })
          }}
          size="$1"
        >
          Resume Editing
        </Button>
      )}
      <XStack>
        {publication.document?.editors.length ? (
          publication.document?.editors.map((editor) => (
            <AccountLinkAvatar accountId={editor} key={editor} />
          ))
        ) : publication.document?.author ? (
          <AccountLinkAvatar accountId={publication.document?.author} />
        ) : null}
      </XStack>
      <Text
        fontFamily="$body"
        fontSize="$2"
        data-testid="list-item-date"
        minWidth="10ch"
        textAlign="right"
      >
        {publication.document?.updateTime
          ? formattedDate(publication.document?.updateTime)
          : '...'}
      </Text>
      <XStack>
        <Popover placement="bottom-end" {...popoverState}>
          <Popover.Trigger asChild>
            <Button size="$2" icon={MoreHorizontal} circular data-trigger />
          </Popover.Trigger>

          <Popover.Content
            data-testid="library-item-dropdown-root"
            padding={0}
            size="$5"
            enterStyle={{x: 0, y: -1, opacity: 0}}
            exitStyle={{x: 0, y: -1, opacity: 0}}
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
          >
            <YGroup elevation="$4" borderColor="transparent">
              <YGroup.Item>
                <MenuItem
                  data-testid="copy-item"
                  onPress={onCopy}
                  title="Copy Document ID"
                  icon={Copy}
                />
              </YGroup.Item>
              <YGroup.Item>
                <MenuItem
                  data-testid="new-window-item"
                  onPress={() =>
                    spawn({
                      key: 'publication',
                      documentId: docId,
                      versionId: publication.version,
                    })
                  }
                  title="Open in new Window"
                  icon={ExternalLink}
                />
              </YGroup.Item>
              <Separator />
              <YGroup.Item>
                <MenuItem
                  title="Delete Publication"
                  onPress={() => {
                    popoverState.onOpenChange(false)
                    dialogState.onOpenChange(true)
                  }}
                  icon={Delete}
                />
              </YGroup.Item>
            </YGroup>
          </Popover.Content>
        </Popover>
        <DeleteDialog
          {...dialogState}
          title="Delete document"
          description="Are you sure you want to delete this document? This action is not reversible."
          cancelButton={
            <Button
              onPress={() => {
                dialogState.onOpenChange(false)
              }}
              chromeless
            >
              Cancel
            </Button>
          }
          actionButton={
            <Button
              theme="red"
              onPress={() => {
                deletePub.mutate(docId)
                dialogState.onOpenChange(false)
              }}
            >
              Delete
            </Button>
          }
        />
      </XStack>
    </Button>
  )
}
