import {useNavRoute} from '@/utils/navigation'
import {useClickNavigate} from '@/utils/useNavigate'
import {
  Document,
  HMAccount,
  HMDocument,
  createHmId,
  getDocumentTitle,
  unpackDocId,
} from '@shm/shared'
import {
  ArrowUpRight,
  Button,
  ButtonText,
  XStack,
  copyTextToClipboard,
} from '@shm/ui'
import React from 'react'
import {useFavorite} from '../models/favorites'
import {NavRoute} from '../utils/routes'
import {useNavigate} from '../utils/useNavigate'
import {BaseAccountLinkAvatar} from './account-link-avatar'
import {FavoriteButton} from './favoriting'
import {ListItem, TimeAccessory} from './list-item'
import {MenuItemType} from './options-dropdown'

export const DocumentListItem = React.memo(function DocumentListItem({
  document,
  debugId,
  hasDraft,
  menuItems = () => [],
  onPointerEnter,
  pathName,
  openRoute,
  onPathNamePress,
  author,
  editors,
}: {
  document: HMDocument
  debugId?: string
  copy?: typeof copyTextToClipboard
  hasDraft: Document | undefined
  menuItems?: () => (MenuItemType | null)[]
  pathName?: string
  onPointerEnter?: () => void
  openRoute: NavRoute
  onPathNamePress?: () => void
  author: HMAccount | string | undefined
  editors: (string | HMAccount | undefined)[]
}) {
  const spawn = useNavigate('spawn')
  const title = getDocumentTitle(document)
  const docId = document.id
  const route = useNavRoute()
  const docRoute = openRoute.key === 'document' ? openRoute : null
  const docHmId = docRoute?.documentId
    ? unpackDocId(docRoute.documentId)
    : undefined
  const docUrl =
    docHmId && docRoute
      ? createHmId('d', docHmId.eid, {
          version: docRoute.versionId,
        })
      : undefined
  const favorite = useFavorite(docUrl)

  if (!docId) throw new Error('DocumentListItem requires document id')

  const navigate = useClickNavigate()

  return (
    <ListItem
      onPress={() => {
        navigate(openRoute, event)
      }}
      title={debugId ? `${title} - ${debugId}` : title}
      onPointerEnter={onPointerEnter}
      accessory={
        <XStack gap="$3" ai="center">
          {docUrl && (
            <XStack
              opacity={favorite.isFavorited ? 1 : 0}
              $group-item-hover={
                favorite.isFavorited ? undefined : {opacity: 1}
              }
            >
              <FavoriteButton url={docUrl} />
            </XStack>
          )}
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
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              overflow="hidden"
              flex={1}
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
              {pathName.length > 40
                ? `${pathName.slice(0, 15)}.....${pathName.slice(
                    pathName.length - 15,
                  )}`
                : pathName}
            </ButtonText>
          )}
          <XStack>
            {editors && editors.length
              ? editors.map((editor, idx) => {
                  const editorId =
                    typeof editor === 'string' ? editor : editor?.id
                  if (!editorId) return null
                  const account = typeof editor == 'string' ? undefined : editor
                  return (
                    <XStack
                      zIndex={idx + 1}
                      key={editorId}
                      borderColor="$background"
                      backgroundColor="$background"
                      borderWidth={2}
                      borderRadius={100}
                      marginLeft={-8}
                      animation="fast"
                    >
                      <BaseAccountLinkAvatar
                        accountId={editorId}
                        account={account}
                      />
                    </XStack>
                  )
                })
              : null}
          </XStack>
          <TimeAccessory
            time={document?.updateTime}
            onPress={() => {
              navigate(openRoute, event)
            }}
          />
        </XStack>
      }
      menuItems={() => [
        ...(menuItems?.() || []),
        {
          key: 'spawn',
          label: 'Open in New Window',
          icon: ArrowUpRight,
          onPress: () => {
            spawn(openRoute)
          },
        },
      ]}
    />
  )
})
