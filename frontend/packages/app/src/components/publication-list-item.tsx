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
import {ListItem} from './list-item'
import {GestureResponderEvent} from 'react-native'

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
  const route = useNavRoute()
  const deleteDialog = useAppDialog(DeleteDocumentDialog, {isAlert: true})

  if (!docId) throw new Error('PublicationListItem requires id')

  function goToItem(event: GestureResponderEvent) {
    event.preventDefault()
    const route: PublicationRoute = {
      key: 'publication',
      documentId: docId!,
      versionId: publication.version,
      pubContext,
    }
    // @ts-expect-error
    console.debug('clicked with meta keys', event.shiftKey, event.metaKey)

    // @ts-expect-error
    if (event.metaKey || event.shiftKey) {
      spawn(route)
    } else {
      navigate(route)
    }
  }

  return (
    <>
      <ListItem
        onPress={goToItem}
        title={title}
        onPrefetch={() => {
          if (publication.document)
            prefetchPublication(publication.document.id, publication.version)
        }}
        accessory={
          <>
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
          </>
        }
        menuItems={[
          {
            key: 'spawn',
            label: 'Open in new Window',
            icon: ExternalLink,
            onPress: () => {
              spawn({
                key: 'publication',
                documentId: docId,
                versionId: publication.version,
              })
            },
          },
          {
            key: 'delete',
            label: 'Delete Publication',
            icon: Delete,
            onPress: () => {
              deleteDialog.open(docId)
            },
          },
        ]}
      />
      {deleteDialog.content}
    </>
  )
}
