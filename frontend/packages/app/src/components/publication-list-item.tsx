import {copyTextToClipboard} from '@mintter/app/src/copy-to-clipboard'
import {useNavigate, useNavRoute} from '@mintter/app/src/utils/navigation'
import {Document, Publication} from '@mintter/shared'
import {Button, ButtonText, ExternalLink, Text, XStack} from '@mintter/ui'
import {AccountLinkAvatar} from './account-link-avatar'
import {PublicationRouteContext} from '@mintter/app/src/utils/navigation'
import {ListItem, MenuItem, TimeAccessory} from './list-item'
import {GestureResponderEvent} from 'react-native'
import {useClickNavigate} from '@mintter/app/src/utils/navigation'
import {NavRoute} from '../utils/navigation'

function unique(keys: string[]) {
  return Array.from(new Set(keys))
}
export function getDocumentTitle(document?: Document) {
  return document?.title || 'Untitled Document'
}

export function PublicationListItem({
  publication,
  hasDraft,
  pubContext,
  menuItems,
  onPointerEnter,
  pathName,
  openRoute,
  onPathNamePress,
}: {
  publication: Publication
  copy?: typeof copyTextToClipboard
  hasDraft: Document | undefined
  pubContext: PublicationRouteContext
  menuItems?: MenuItem[]
  pathName?: string
  onPointerEnter?: () => void
  openRoute: NavRoute
  onPathNamePress?: () => void
}) {
  const spawn = useNavigate('spawn')
  const title = getDocumentTitle(publication.document)
  const docId = publication.document?.id
  const route = useNavRoute()

  if (!docId) throw new Error('PublicationListItem requires id')

  const navigate = useClickNavigate()

  function goToItem(event: GestureResponderEvent) {
    navigate(openRoute, event)
  }

  return (
    <ListItem
      onPress={goToItem}
      title={title}
      onPointerEnter={onPointerEnter}
      accessory={
        <XStack gap="$3">
          {hasDraft && (
            <Button
              theme="yellow"
              zIndex="$zIndex.5"
              onPress={(e) => {
                navigate(
                  {
                    key: 'draft',
                    draftId: hasDraft.id,
                    contextRoute: route,
                    pubContext,
                  },
                  e,
                )
              }}
              size="$1"
            >
              Resume Editing
            </Button>
          )}
          {pathName && (
            <ButtonText
              size="$2"
              color="$color9"
              onPress={(e) => {
                if (onPathNamePress) {
                  e.stopPropagation()
                  onPathNamePress()
                }
              }}
              hoverStyle={
                onPathNamePress
                  ? {
                      textDecorationLine: 'underline',
                    }
                  : undefined
              }
            >
              {pathName}
            </ButtonText>
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
          <TimeAccessory
            time={publication.document?.updateTime}
            onPress={goToItem}
          />
        </XStack>
      }
      menuItems={[
        {
          key: 'spawn',
          label: 'Open in new Window',
          icon: ExternalLink,
          onPress: () => {
            spawn(openRoute)
          },
        },
        ...(menuItems || []),
      ]}
    />
  )
}
