import {prefetchPublication} from '@mintter/app/src/models/documents'
import {copyTextToClipboard} from '@mintter/app/src/copy-to-clipboard'
import {useNavigate, useNavRoute} from '@mintter/app/src/utils/navigation'
import {Document, Publication} from '@mintter/shared'
import {Button, ButtonText, ExternalLink, Text, XStack} from '@mintter/ui'
import {AccountLinkAvatar} from './account-link-avatar'
import {PublicationRouteContext} from '@mintter/app/src/utils/navigation'
import {ListItem, MenuItem, TimeAccessory} from './list-item'
import {GestureResponderEvent} from 'react-native'
import {useClickNavigate} from '@mintter/app/src/utils/navigation'

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
  menuItems,
  label,
}: {
  publication: Publication
  copy?: typeof copyTextToClipboard
  hasDraft: Document | undefined
  pubContext: PublicationRouteContext
  menuItems?: MenuItem[]
  label?: string
}) {
  const spawn = useNavigate('spawn')
  const title = getDocumentTitle(publication.document)
  const docId = publication.document?.id
  const route = useNavRoute()

  if (!docId) throw new Error('PublicationListItem requires id')

  const navigate = useClickNavigate()

  function goToItem(event: GestureResponderEvent) {
    navigate(
      {
        key: 'publication',
        documentId: docId!,
        versionId: publication.version,
        pubContext,
      },
      event,
    )
  }

  return (
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
                navigate(
                  {
                    key: 'draft',
                    draftId: hasDraft.id,
                    contextRoute: route,
                  },
                  e,
                )
              }}
              size="$1"
            >
              Resume Editing
            </Button>
          )}
          {label && <ButtonText size="$2">{label}</ButtonText>}

          <XStack>
            {publication.document?.editors.length ? (
              unique(publication.document?.editors).map((editor) => (
                <AccountLinkAvatar accountId={editor} key={editor} />
              ))
            ) : publication.document?.author ? (
              <AccountLinkAvatar accountId={publication.document?.author} />
            ) : null}
          </XStack>
          <TimeAccessory
            time={publication.document?.updateTime}
            onPress={goToItem}
          />
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
        ...(menuItems || []),
      ]}
    />
  )
}
