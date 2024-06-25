import { useNavRoute } from '@shm/desktop/src/utils/navigation'
import { useClickNavigate } from '@shm/desktop/src/utils/useNavigate'
import {
  Document,
  HMAccount,
  HMPublication,
  createHmId,
  getDocumentTitle,
  unpackDocId
} from '@shm/shared'
import {
  ArrowUpRight,
  Button,
  ButtonText,
  XStack,
  copyTextToClipboard,
} from '@shm/ui'
import React from 'react'
import { useFavorite } from '../models/favorites'
import { NavRoute } from '../utils/routes'
import { useNavigate } from '../utils/useNavigate'
import { BaseAccountLinkAvatar } from './account-link-avatar'
import { FavoriteButton } from './favoriting'
import { ListItem, TimeAccessory } from './list-item'
import { MenuItemType } from './options-dropdown'

export const PublicationListItem = React.memo(function PublicationListItem({
  publication,
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
  publication: HMPublication
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
  const title = getDocumentTitle(publication.document)
  const docId = publication.document?.id
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

  if (!docId) throw new Error('PublicationListItem requires id')

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
                favorite.isFavorited ? undefined : { opacity: 1 }
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
            time={publication.document?.updateTime}
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
