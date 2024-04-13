import {AuthorVariant, GroupVariant} from '@mintter/shared'
import {Home} from '@mintter/ui'
import {Book, Contact, FileText, Sparkles, Star} from '@tamagui/lucide-icons'
import {memo} from 'react'
import {useAccount, useMyAccount} from '../models/accounts'
import {usePublication, usePublicationEmbeds} from '../models/documents'
import {useGroup, useGroupFrontPub} from '../models/groups'
import {usePublicationVariant} from '../models/publication'
import {useNavRoute} from '../utils/navigation'
import {
  AccountRoute,
  GroupRoute,
  NavRoute,
  PublicationRoute,
} from '../utils/routes'
import {useNavigate} from '../utils/useNavigate'
import {
  GenericSidebarContainer,
  MyAccountItem,
  SidebarDivider,
  SidebarItem,
  activeDocOutline,
  getDocOutline,
} from './sidebar-base'

export const AppSidebar = memo(MainAppSidebar)

export function MainAppSidebar() {
  const route = useNavRoute()
  const navigate = useNavigate()
  const replace = useNavigate('replace')
  const account = useMyAccount()

  const pubRoute = route.key === 'publication' ? route : null
  const pubAuthorVariants = pubRoute?.variants?.filter(
    (variant) => variant.key === 'author',
  ) as AuthorVariant[] | undefined
  const pubGroupVariants = pubRoute?.variants?.filter(
    (variant) => variant.key === 'group',
  ) as GroupVariant[] | undefined
  if (pubGroupVariants && pubGroupVariants.length > 1) {
    throw new Error('Multiple group variants not currently supported')
  }
  if (
    pubAuthorVariants &&
    pubAuthorVariants.length > 1 &&
    pubGroupVariants &&
    pubGroupVariants.length > 1
  ) {
    throw new Error(
      'Combined author and group variants not currently supported',
    )
  }
  const myAccount = useMyAccount()
  const accountRoute = route.key === 'account' ? route : null
  const activeBlock = accountRoute?.blockId
  const myProfileDoc = usePublication(
    {
      id: myAccount.data?.profile?.rootDocument,
    },
    {
      keepPreviousData: false,
    },
  )
  const myProfileDocEmbeds = usePublicationEmbeds(
    myProfileDoc.data,
    !!myProfileDoc.data,
    {skipCards: true},
  )
  const frontDocOutline = getDocOutline(
    myProfileDoc?.data?.document?.children || [],
    myProfileDocEmbeds,
  )
  const {outlineContent: myAccountOutlineContent, isBlockActive} =
    activeDocOutline(
      frontDocOutline,
      activeBlock,
      myProfileDocEmbeds,
      (blockId) => {
        const myAccountId = myAccount.data?.id
        if (!myAccountId) return
        const accountRoute =
          route.key == 'account' && myAccountId === route.accountId
            ? route
            : null
        if (!accountRoute) {
          navigate({
            key: 'account',
            accountId: myAccountId,
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
      <SidebarItem
        active={route.key == 'feed'}
        onPress={() => {
          navigate({key: 'feed', tab: 'trusted'})
        }}
        title="Home Feed"
        bold
        icon={Home}
      />
      <SidebarItem
        active={route.key == 'explore'}
        onPress={() => {
          navigate({key: 'explore', tab: 'docs'})
        }}
        title="Explore Content"
        bold
        icon={Sparkles}
        rightHover={[]}
      />
      <SidebarItem
        active={route.key == 'favorites'}
        onPress={() => {
          navigate({key: 'favorites'})
        }}
        title="Favorites"
        bold
        icon={Star}
        rightHover={[]}
      />
      <SidebarItem
        active={route.key == 'contacts'}
        onPress={() => {
          navigate({key: 'contacts'})
        }}
        icon={Contact}
        title="Contacts"
        bold
      />
      <SidebarDivider />
      {account.data && (
        <MyAccountItem
          active={
            route.key == 'account' &&
            route.accountId == myAccount.data?.id &&
            !isBlockActive
          }
          account={account.data}
          onRoute={navigate}
        />
      )}
      {myAccountOutlineContent}
      <RouteOutline route={route} myAccountId={myAccount.data?.id} />
    </GenericSidebarContainer>
  )
}

function RouteOutline({
  route,
  myAccountId,
}: {
  route: NavRoute
  myAccountId: string | undefined
}) {
  if (route.key === 'account') {
    if (route.accountId === myAccountId) return null
    return (
      <>
        <SidebarDivider />
        <AccountRouteOutline route={route} />
      </>
    )
  }
  if (route.key === 'publication') {
    return (
      <>
        <SidebarDivider />
        <PublicationRouteOutline route={route} />
      </>
    )
  }
  if (route.key === 'group') {
    return (
      <>
        <SidebarDivider />
        <GroupRouteOutline route={route} />
      </>
    )
  }
  return null
}

function AccountRouteOutline({route}: {route: AccountRoute}) {
  const account = useAccount(route.accountId)
  return (
    <SidebarItem
      active={true}
      onPress={() => {}}
      title={account.data?.profile?.alias}
      icon={Contact}
    />
  )
}

function PublicationRouteOutline({route}: {route: PublicationRoute}) {
  const pub = usePublicationVariant({
    documentId: route.documentId,
    versionId: route.versionId,
    variants: route.variants,
  })
  return (
    <SidebarItem
      active={true}
      onPress={() => {}}
      title={pub.data?.publication?.document?.title}
      icon={FileText}
    />
  )
}

function GroupRouteOutline({route}: {route: GroupRoute}) {
  const group = useGroup(route.groupId, route.version)
  const frontPub = useGroupFrontPub(route.groupId, route.version)
  const navigate = useNavigate()
  const frontPubEmbeds = usePublicationEmbeds(frontPub.data, !!frontPub.data, {
    skipCards: true,
  })
  const frontDocOutline = getDocOutline(
    frontPub?.data?.document?.children || [],
    frontPubEmbeds,
  )
  const {outlineContent: frontPubOutlineContent, isBlockActive} =
    activeDocOutline(
      frontDocOutline,
      null,
      frontPubEmbeds,
      (blockId) => {
        console.log('activate block', blockId)
        // const myAccountId = myAccount.data?.id
        // if (!myAccountId) return
        // const accountRoute =
        //   route.key == 'account' && myAccountId === route.accountId
        //     ? route
        //     : null
        // if (!accountRoute) {
        //   navigate({
        //     key: 'account',
        //     accountId: myAccountId,
        //     blockId,
        //   })
        // } else {
        //   replace({
        //     ...accountRoute,
        //     blockId,
        //   })
        // }
      },
      navigate,
    )
  return (
    <>
      <SidebarItem
        active={!isBlockActive}
        onPress={() => {}}
        title={group.data?.title}
        icon={Book}
      />
      {frontPubOutlineContent}
    </>
  )
}
