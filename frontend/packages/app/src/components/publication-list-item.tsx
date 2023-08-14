import {prefetchPublication} from '@mintter/app/src/models/documents'
import {usePopoverState} from '@mintter/app/src/use-popover-state'
import {copyTextToClipboard} from '@mintter/app/src/copy-to-clipboard'
import {
  PublicationRoute,
  useNavigate,
  useNavRoute,
} from '@mintter/app/src/utils/navigation'
import {Document, formattedDate, Publication} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Delete,
  ExternalLink,
  MoreHorizontal,
  Popover,
  Separator,
  Text,
  XStack,
  YGroup,
} from '@mintter/ui'
import {MouseEvent, useEffect, useState} from 'react'
import {AccountLinkAvatar} from './account-link-avatar'
import {MenuItem} from '@mintter/app/src/components/dropdown'
import {PublicationRouteContext} from '@mintter/app/src/utils/navigation'
import {useAppDialog} from './dialog'
import {DeleteDocumentDialog} from './delete-dialog'

function unique(keys: string[]) {
  return Array.from(new Set(keys))
}
export function getDocumentTitle(document?: Document) {
  return document?.title || 'Untitled Document'
}

export function PublicationListItem({
  publication,
  hasDraft,
  copy = copyTextToClipboard,
  pubContext,
}: {
  publication: Publication
  copy?: typeof copyTextToClipboard
  hasDraft: Document | undefined
  pubContext: PublicationRouteContext
}) {
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  const title = getDocumentTitle(publication.document)
  const docId = publication.document?.id
  const popoverState = usePopoverState()
  const route = useNavRoute()
  const deleteDialog = useAppDialog(DeleteDocumentDialog, {isAlert: true})

  const [isHovering, setIsHovering] = useState(false)
  if (!docId) throw new Error('PublicationListItem requires id')

  useEffect(() => {
    if (popoverState.open) {
      popoverState.onOpenChange(false)
    }
  }, [isHovering])

  function goToItem(event: MouseEvent) {
    event.preventDefault()
    const route: PublicationRoute = {
      key: 'publication',
      documentId: docId!,
      versionId: publication.version,
      pubContext,
    }
    if (event.metaKey || event.shiftKey) {
      spawn(route)
    } else {
      navigate(route)
    }
  }

  return (
    <>
      <Button
        onPointerEnter={() => setIsHovering(true)}
        onPointerLeave={() => setIsHovering(false)}
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
            unique(publication.document?.editors).map((editor) => (
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
          {isHovering ? (
            <Popover {...popoverState} placement="bottom-end">
              <Popover.Trigger asChild>
                <Button size="$1" circular data-trigger icon={MoreHorizontal} />
              </Popover.Trigger>
              <Popover.Content padding={0} elevation="$2">
                <YGroup separator={<Separator />}>
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
                  <YGroup.Item>
                    <MenuItem
                      title="Delete Publication"
                      onPress={() => {
                        popoverState.onOpenChange(false)
                        deleteDialog.open(docId)
                      }}
                      icon={Delete}
                    />
                  </YGroup.Item>
                </YGroup>
              </Popover.Content>
            </Popover>
          ) : (
            <Button size="$1" opacity={0} circular icon={MoreHorizontal} />
          )}
        </XStack>
      </Button>
      {deleteDialog.content}
    </>
  )
}
