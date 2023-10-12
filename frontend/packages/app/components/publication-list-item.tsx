import {copyTextToClipboard} from '@mintter/app/copy-to-clipboard'
import {
  PublicationRouteContext,
  useNavRoute,
} from '@mintter/app/utils/navigation'
import {useClickNavigate} from '@mintter/app/utils/useNavigate'
import {Document, Publication, shortenPath} from '@mintter/shared'
import {Button, ButtonText, ExternalLink, XStack} from '@mintter/ui'
import {GestureResponderEvent} from 'react-native'
import {NavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {AccountLinkAvatar} from './account-link-avatar'
import {ListItem, MenuItem, TimeAccessory} from './list-item'

function unique(keys: string[]) {
  return Array.from(new Set(keys))
}
export function getDocumentTitle(document?: Document) {
  let res = document?.title || 'Untitled Document'
  return shortenPath(res)
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
  menuItems?: (MenuItem | null)[]
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
              {shortenPath(pathName)}
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
        ...(menuItems || []),
        {
          key: 'spawn',
          label: 'Open in New Window',
          icon: ExternalLink,
          onPress: () => {
            spawn(openRoute)
          },
        },
      ]}
    />
  )
}
