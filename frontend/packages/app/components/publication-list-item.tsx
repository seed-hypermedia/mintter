import {copyTextToClipboard} from '@mintter/app/copy-to-clipboard'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {useClickNavigate} from '@mintter/app/utils/useNavigate'
import {Account, Document, Publication, shortenPath} from '@mintter/shared'
import {ArrowUpRight, Button, ButtonText, XStack} from '@mintter/ui'
import {memo, useEffect, useState} from 'react'
import {NavRoute, PublicationVariant} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {BaseAccountLinkAvatar} from './account-link-avatar'
import {ListItem, TimeAccessory} from './list-item'
import {MenuItemType} from './options-dropdown'

export function getDocumentTitle(document?: Document) {
  let res = document?.title || 'Untitled Document'
  return shortenPath(res)
}
export const PublicationListItem = memo(PublicationListItemUnmemo)
export function PublicationListItemUnmemo({
  publication,
  hasDraft,
  variant,
  menuItems,
  onPointerEnter,
  pathName,
  openRoute,
  onPathNamePress,
  author,
  editors,
}: {
  publication: Publication
  copy?: typeof copyTextToClipboard
  hasDraft: Document | undefined
  variant?: PublicationVariant
  menuItems?: (MenuItemType | null)[]
  pathName?: string
  onPointerEnter?: () => void
  openRoute: NavRoute
  onPathNamePress?: () => void
  author: Account | string | undefined
  editors: (string | Account | undefined)[]
}) {
  const spawn = useNavigate('spawn')
  const title = getDocumentTitle(publication.document)
  const docId = publication.document?.id
  const route = useNavRoute()

  if (!docId) throw new Error('PublicationListItem requires id')

  const navigate = useClickNavigate()
  const [accessory, setAccessory] = useState(
    <TimeAccessory
      time={publication.document?.updateTime}
      onPress={() => {
        navigate(openRoute, event)
      }}
    />,
  )
  useEffect(() => {
    setAccessory(
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
                  variant: variant?.key === 'group' ? variant : undefined,
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
          {editors && editors.length
            ? editors.map((editor, idx) => {
                const editorId =
                  typeof editor === 'string' ? editor : editor?.id
                if (!editorId) return null
                const account = typeof editor === 'string' ? undefined : editor
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
      </XStack>,
    )
  }, [
    editors,
    hasDraft,
    navigate,
    onPathNamePress,
    openRoute,
    pathName,
    publication.document?.updateTime,
    route,
    variant,
  ])
  return (
    <ListItem
      onPress={(event) => {
        console.log('did press', openRoute)
        navigate(openRoute, event)
      }}
      title={title}
      onPointerEnter={onPointerEnter}
      accessory={accessory}
      menuItems={[
        ...(menuItems || []),
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
}
