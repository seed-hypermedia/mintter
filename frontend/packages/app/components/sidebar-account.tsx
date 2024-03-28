import {unpackHmId} from '@mintter/shared'
import {YGroup, YStack} from '@mintter/ui'
import {Book, FileText, Newspaper, Undo2} from '@tamagui/lucide-icons'
import {useAccount} from '../models/accounts'
import {usePublication, usePublicationEmbeds} from '../models/documents'
import {getAvatarUrl} from '../utils/account-url'
import {useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {Avatar} from './avatar'
import {
  GenericSidebarContainer,
  SidebarDocument,
  SidebarItem,
  activeDocOutline,
  getDocOutline,
} from './sidebar-base'

export function AccountSidebar({
  accountId,
  onBackToMain,
}: {
  accountId: string
  onBackToMain: () => void
}) {
  const route = useNavRoute()
  const replace = useNavigate('replace')
  const navigate = useNavigate()
  const accountRoute = route.key === 'account' ? route : null
  const isAccountActive =
    accountRoute?.accountId === accountId && accountRoute?.blockId == null
  const account = useAccount(accountId)
  const frontDoc = usePublication(
    {
      id: account.data?.profile?.rootDocument,
    },
    {
      keepPreviousData: false,
    },
  )
  const frontDocEmbeds = usePublicationEmbeds(frontDoc.data, !!frontDoc.data, {
    skipCards: true,
  })
  const isFeedActive =
    route.key === 'account-feed' && route.accountId === accountId
  const activeBlock = accountRoute?.blockId
  const frontDocOutline = getDocOutline(
    frontDoc?.data?.document?.children || [],
    frontDocEmbeds,
  )
  const {outlineContent, isBlockActive} = activeDocOutline(
    frontDocOutline,
    activeBlock,
    frontDocEmbeds,
    (blockId) => {
      const accountRoute = route.key == 'account' ? route : null
      if (!accountRoute) {
        navigate({
          key: 'account',
          accountId,
          blockId,
        })
      } else {
        replace({
          ...accountRoute,
          blockId,
        })
      }
    },
    navigate,
  )
  return (
    <GenericSidebarContainer>
      <YStack paddingVertical="$2">
        <SidebarItem
          minHeight={30}
          paddingVertical="$2"
          color="$color10"
          title="Home Navigation"
          onPress={() => {
            onBackToMain()
          }}
          icon={Undo2}
        />
        <SidebarItem
          active={isAccountActive}
          onPress={() => {
            if (!isAccountActive) {
              navigate({
                key: 'account',
                accountId,
              })
            }
          }}
          bold
          paddingVertical="$4"
          icon={
            <Avatar
              size={36}
              label={account?.data?.profile?.alias}
              id={account?.data?.id}
              url={getAvatarUrl(account?.data?.profile?.avatar)}
            />
          }
          title={account.data?.profile?.alias}
        />
        <YGroup borderRadius={0}>{outlineContent}</YGroup>

        <SidebarItem
          onPress={() => {
            if (route.key !== 'account-content' || route.type !== 'documents') {
              navigate({
                key: 'account-content',
                accountId,
                type: 'documents',
              })
            }
          }}
          icon={FileText}
          active={route.key === 'account-content' && route.type === 'documents'}
          title="Documents"
        />
        <SidebarItem
          onPress={() => {
            if (route.key !== 'account-content' || route.type !== 'groups') {
              navigate({
                key: 'account-content',
                accountId,
                type: 'groups',
              })
            }
          }}
          icon={Book}
          active={route.key === 'account-content' && route.type === 'groups'}
          title="Groups"
        />
        <SidebarItem
          onPress={() => {
            if (!isFeedActive) {
              navigate({
                key: 'account-feed',
                accountId,
              })
            }
          }}
          icon={Newspaper}
          active={isFeedActive}
          title="Account Feed"
        />
        {/* <SizableText>{accountId}</SizableText> */}
      </YStack>
    </GenericSidebarContainer>
  )
}

function ActiveDocSidebarItem({id}: {id: string | null}) {
  const docId = id ? unpackHmId(id) : null
  if (!docId) return null
  return (
    <SidebarDocument
      docId={docId.qid}
      docVersion={docId.version}
      isPinned={false}
      onPress={() => {}}
    />
  )
}
