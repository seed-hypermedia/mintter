import {AccountLinkAvatar} from '@mintter/app/components/account-link-avatar'
import {useDraftTitle} from '@mintter/app/models/documents'
import {usePublicationInContext} from '@mintter/app/models/publication'
import {
  DraftRoute,
  PublicationRoute,
  useNavRoute,
} from '@mintter/app/utils/navigation'
import {
  ErrorIcon,
  FontSizeTokens,
  Globe,
  Pencil,
  SizableText,
  Spinner,
  TitleText,
  XStack,
} from '@mintter/ui'
import {Bookmark, Contact, Library} from '@tamagui/lucide-icons'
import {useEffect} from 'react'
import {NavRoute} from '../utils/navigation'
import {getDocumentTitle} from './publication-list-item'
import {PageContextButton} from './publish-share'

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
    return <PageContextButton />
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
    return (
      <>
        <PageContextButton />
        <Slash />
        <PublicationTitle route={route} />
      </>
    )
  }
  if (route.key === 'draft') {
    return (
      <>
        <PageContextButton />
        <Slash />
        <DraftTitle route={route} />
      </>
    )
  }
  return null
}

function Slash() {
  return (
    <SizableText color="$color8" fontSize="$6" userSelect="none">
      /
    </SizableText>
  )
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
  let pub = usePublicationInContext({
    documentId: route.documentId,
    versionId: route.versionId,
    pubContext: route.pubContext,
    enabled: !!route.documentId,
  })
  if (pub.error) {
    return <ErrorIcon />
  }
  const document = pub.data?.document
  return (
    <>
      <TitleText data-testid="titlebar-title" size={size}>
        {pub.isInitialLoading ? <Spinner /> : getDocumentTitle(document)}
      </TitleText>
      <XStack gap={0} data-tauri-drag-region>
        {document?.editors.length === 0 ? (
          <AccountLinkAvatar accountId={document?.author} />
        ) : (
          document?.editors.map((editor) => (
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
      <TitleText data-testid="titlebar-title" size={size}>
        {displayTitle}
      </TitleText>
    </>
  )
}
