import {usePublicationInContext} from '@mintter/app/models/publication'
import {AccountLinkAvatar} from '@mintter/app/components/account-link-avatar'
import {useDraftTitle} from '@mintter/app/models/documents'
import {
  DraftRoute,
  PublicationRoute,
  useNavRoute,
} from '@mintter/app/utils/navigation'
import {hostnameStripProtocol} from '@mintter/app/utils/site-hostname'
import {FontSizeTokens, Globe, Pencil, TitleText, XStack} from '@mintter/ui'
import {Bookmark, Contact, Library} from '@tamagui/lucide-icons'
import {useEffect} from 'react'
import {NavRoute} from '../../utils/navigation'
import {getDocumentTitle} from '../publication-list-item'

export function TitleContent({size = '$4'}: {size?: FontSizeTokens}) {
  const route = useNavRoute()

  useEffect(() => {
    async function getTitleOfRoute(route: NavRoute): Promise<string> {
      if (route.key === 'home') return 'Publications'
      if (route.key === 'drafts') return 'Drafts'
      if (route.key === 'contacts') return 'Contacts'
      return '?'
    }
    getTitleOfRoute(route).then((title) => {
      // we set the window title so the window manager knows the title in the Window menu
      // @ts-ignore
      window.document.title = title
    })
  }, [route])

  if (route.key === 'home') {
    return (
      <>
        <Bookmark size={12} />
        <TitleText size={size} data-testid="titlebar-title">
          Publications
        </TitleText>
      </>
    )
  }
  if (route.key === 'all-publications') {
    return (
      <>
        <Globe size={12} />
        <TitleText data-testid="titlebar-title" size={size}>
          All Publications
        </TitleText>
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
    return null
  }
  if (route.key === 'drafts') {
    return (
      <>
        <Pencil size={12} />
        <TitleText data-testid="titlebar-title" size={size}>
          Drafts
        </TitleText>
      </>
    )
  }
  if (route.key === 'account') {
    return (
      <TitleText data-testid="titlebar-title" size={size}>
        Account Profile
      </TitleText>
    )
  }

  if (route.key === 'publication') {
    return <PublicationTitle route={route} />
  }
  if (route.key === 'draft') {
    return <DraftTitle route={route} />
  }
  return null
}

export function Title({size}: {size?: FontSizeTokens}) {
  return (
    <XStack
      gap="$2"
      alignItems="center"
      margin="auto"
      marginVertical={0}
      paddingHorizontal="$4"
      flex={1}
      justifyContent="center"
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
  let {data: pub} = usePublicationInContext({
    documentId: route.documentId,
    versionId: route.versionId,
    pubContext: route.pubContext,
    enabled: !!route.documentId,
  })
  return (
    <>
      <TitleText data-testid="titlebar-title" size={size}>
        {getDocumentTitle(pub?.document)}
      </TitleText>
      <XStack gap={0} data-tauri-drag-region>
        {pub?.document?.editors.length === 0 ? (
          <AccountLinkAvatar accountId={pub?.document?.author} />
        ) : (
          pub?.document?.editors.map((editor) => (
            <AccountLinkAvatar accountId={editor} key={editor} />
          ))
        )}
      </XStack>
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
  return (
    <>
      <Pencil size={12} />
      <TitleText data-testid="titlebar-title" size={size}>
        {displayTitle}
      </TitleText>
    </>
  )
}
