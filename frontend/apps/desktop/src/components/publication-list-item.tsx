import {Dropdown} from '@app/components/dropdown'
import {prefetchPublication, useDeletePublication} from '@app/models/documents'
import {usePopoverState} from '@app/use-popover-state'
import {copyTextToClipboard} from '@mintter/app'
import {PublicationRoute, useNavigate, useNavRoute} from '@app/utils/navigation'
import {Document, formattedDate, Publication} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Delete,
  ExternalLink,
  MoreHorizontal,
  Text,
  XStack,
} from '@mintter/ui'
import {MouseEvent} from 'react'
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
  const route = useNavRoute()
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
              contextRoute: route,
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
          <Dropdown.Trigger circular data-trigger icon={MoreHorizontal} />

          <Dropdown.Content
            align="end"
            data-testid="library-item-dropdown-root"
            // padding={0}
            // size="$5"
            // enterStyle={{x: 0, y: -1, opacity: 0}}
            // exitStyle={{x: 0, y: -1, opacity: 0}}
            // animation={[
            //   'quick',
            //   {
            //     opacity: {
            //       overshootClamping: true,
            //     },
            //   },
            // ]}
          >
            {/* <Dropdown.Item
              data-testid="copy-item"
              onPress={() => {
                const docUrl = getDocUrl(publication, webPub)
                if (!docUrl) return
                copyTextToClipboard(docUrl)
                toast.success(
                  `Copied ${hostnameStripProtocol(publishedWebHost)} URL`,
                )
              }}
              title={`Copy Document URL on ${hostnameStripProtocol(
                publishedWebHost,
              )}`}
              icon={Copy}
            /> */}
            <Dropdown.Item
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

            <Dropdown.Item
              title="Delete Publication"
              onPress={() => {
                popoverState.onOpenChange(false)
                dialogState.onOpenChange(true)
              }}
              icon={Delete}
            />
          </Dropdown.Content>
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
