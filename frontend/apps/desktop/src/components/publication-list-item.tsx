import {publicationsClient} from '@app/api-clients'
import {deleteFileMachine} from '@app/delete-machine'
import {Dropdown} from '@app/editor/dropdown'
import {prefetchPublication, useDeletePublication} from '@app/models/documents'
import {queryKeys} from '@app/models/query-keys'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {PublicationRoute, useNavigate} from '@app/utils/navigation'
import {
  Document,
  formattedDate,
  MINTTER_LINK_PREFIX,
  Publication,
} from '@mintter/shared'
import {useQueryClient} from '@tanstack/react-query'
import {useActor, useInterpret} from '@xstate/react'
import Highlighter from 'react-highlight-words'
import {toast} from 'react-hot-toast'
import {DeleteDialog} from './delete-dialog'
import {MouseEvent} from 'react'
import {
  XStack,
  Text,
  Button,
  ButtonText,
  MoreHorizontal,
  ListItem,
  Copy,
  ExternalLink,
  Delete,
  Separator,
} from '@mintter/ui'
import {AccountLinkAvatar} from './account-link-avatar'
import {usePopoverState} from '@app/use-popover-state'

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
        <Dropdown.Root {...popoverState}>
          <Dropdown.Trigger icon={MoreHorizontal} circular data-trigger />
          <Dropdown.Portal>
            <Dropdown.Content
              align="end"
              data-testid="library-item-dropdown-root"
            >
              <Dropdown.Item
                data-testid="copy-item"
                onSelect={onCopy}
                asChild
                title="Copy Document ID"
                icon={Copy}
              />
              <Dropdown.Item
                data-testid="new-window-item"
                onSelect={() =>
                  spawn({
                    key: 'publication',
                    documentId: docId,
                    versionId: publication.version,
                  })
                }
                title="Open in new Window"
                icon={ExternalLink}
              />
              <Separator />
              <Dropdown.Item
                title="Delete Publication"
                onSelect={() => {
                  popoverState.onOpenChange(false)
                  dialogState.onOpenChange(true)
                }}
                icon={Delete}
              />
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
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
