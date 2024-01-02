import {useDraftTitle} from '@mintter/app/models/documents'
import {usePublicationVariant} from '@mintter/app/models/publication'
import {
  DraftRoute,
  PublicationRoute,
  useNavRoute,
} from '@mintter/app/utils/navigation'
import {
  ErrorIcon,
  FontSizeTokens,
  SizableText,
  Spinner,
  TitleText,
  XStack,
} from '@mintter/ui'
import {Book, Contact, FileText, Library} from '@tamagui/lucide-icons'
import {useEffect} from 'react'
import {useAccount} from '../models/accounts'
import {useGroup} from '../models/groups'
import {AccountRoute, GroupRoute, NavRoute} from '../utils/navigation'
import {getDocumentTitle} from './publication-list-item'
import {VersionContext} from './variants'

export function TitleContent({size = '$4'}: {size?: FontSizeTokens}) {
  const route = useNavRoute()

  useEffect(() => {
    async function getTitleOfRoute(route: NavRoute): Promise<string> {
      if (route.key === 'documents') return 'Documents'
      if (route.key === 'contacts') return 'Contacts'
      if (route.key === 'groups') return 'Groups'
      return ''
    }
    getTitleOfRoute(route).then((title) => {
      // we set the window title so the window manager knows the title in the Window menu
      // @ts-ignore
      window.document.title = title
      // window.windowInfo.setTitle(title)
    })
  }, [route])

  if (route.key === 'documents') {
    let subtitle: string | null = null
    if (route.tab === 'drafts') {
      subtitle = '- Drafts'
    } else if (route.tab === 'all') {
      subtitle = '- All Publications'
    } else {
      subtitle = '- Trusted Publications'
    }
    return (
      <>
        <FileText size={12} />
        <TitleText size={size} fontWeight="bold" data-testid="titlebar-title">
          Documents
        </TitleText>
        <SizableText>{subtitle}</SizableText>
      </>
    )
  }
  if (route.key === 'contacts') {
    return (
      <>
        <Contact size={12} />
        <TitleText data-testid="titlebar-title" size={size}>
          Contacts
        </TitleText>
      </>
    )
  }
  if (route.key === 'groups') {
    return (
      <>
        <Library size={12} />
        <TitleText size={size}>Groups</TitleText>
      </>
    )
  }
  if (route.key === 'group') {
    return (
      <>
        <GroupTitle route={route} />
        <VersionContext route={route} />
      </>
    )
  }
  if (route.key === 'account') {
    return (
      <>
        <AccountProfileTitle route={route} size={size} />
      </>
    )
  }
  if (route.key === 'publication') {
    return (
      <>
        {/* <PageContextButton />
        <Slash /> */}
        <PublicationTitle route={route} />
        <VersionContext route={route} />
      </>
    )
  }
  if (route.key === 'draft') {
    return (
      <>
        {/* <PageContextButton />
        <Slash /> */}
        <DraftTitle route={route} />
      </>
    )
  }
  return null
}

function AccountProfileTitle({
  route,
  size,
}: {
  route: AccountRoute
  size?: FontSizeTokens
}) {
  const account = useAccount(route.accountId)

  useWindowTitle(
    account.data.profile.alias
      ? `Account Profile: ${account.data.profile.alias}`
      : 'Account Profile',
  )

  return (
    <TitleText data-testid="titlebar-title" size={size}>
      {account.data.profile.alias
        ? `Account Profile: ${account.data.profile.alias}`
        : 'Account Profile'}
    </TitleText>
  )
}

function GroupTitle({route}: {route: GroupRoute}) {
  const group = useGroup(route.groupId)
  useWindowTitle(group.data?.title ? `Group: ${group.data?.title}` : undefined)
  if (!group.data) return null

  return (
    <XStack ai="center" gap="$2">
      <Book size={16} />
      <SizableText>{group.data.title}</SizableText>
    </XStack>
  )
}

export function Title({size}: {size?: FontSizeTokens}) {
  return (
    <XStack
      gap="$2"
      alignItems="flex-start"
      marginVertical={0}
      paddingHorizontal="$4"
      justifyContent="flex-start"
      ai="center"
    >
      <TitleContent size={size} />
    </XStack>
  )
}

function PublicationTitle({
  route,
  size = '$4',
}: {
  route: PublicationRoute
  size?: FontSizeTokens
}) {
  let pub = usePublicationVariant({
    documentId: route.documentId,
    versionId: route.versionId,
    variant: route.variant,
    enabled: !!route.documentId,
  })

  useWindowTitle(
    pub.data?.publication?.document
      ? `Publication: ${getDocumentTitle(pub.data?.publication?.document)}`
      : undefined,
  )

  if (pub.error) {
    return <ErrorIcon />
  }
  const document = pub.data?.publication?.document
  return (
    <>
      <TitleText fontWeight="bold" data-testid="titlebar-title" size={size}>
        {pub.isInitialLoading ? <Spinner /> : getDocumentTitle(document)}
      </TitleText>
    </>
  )
}

function DraftTitle({
  route,
  size = '$4',
}: {
  route: DraftRoute
  size?: FontSizeTokens
}) {
  const title = useDraftTitle({
    documentId: route.draftId,
  })
  const displayTitle = title ?? 'Untitled Document'
  useWindowTitle(displayTitle ? `Draft: ${displayTitle}` : undefined)
  return (
    <>
      <TitleText data-testid="titlebar-title" size={size}>
        {displayTitle}
      </TitleText>
    </>
  )
}

function useWindowTitle(title?: string) {
  useEffect(() => {
    if (title) {
      window.document.title = title
    }
  }, [title])
}
