import {useAuthor, useDraft, usePublication} from '@app/hooks'
import {
  DraftRoute,
  PublicationRoute,
  useNavRoute,
  useNavigate,
} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {
  ButtonText,
  SizeTokens,
  TitleText,
  XStack,
  File,
  User,
  Pencil,
} from '@mintter/ui'

export function TitleContent({size = '$4'}: {size?: SizeTokens}) {
  const route = useNavRoute()
  if (route.key === 'home') {
    return (
      <>
        <File size={12} />
        <TitleText size={size}>All Publications</TitleText>
      </>
    )
  }
  if (route.key === 'connections') {
    return (
      <>
        <User size={12} />
        <TitleText size={size}>Connections</TitleText>
      </>
    )
  }
  if (route.key === 'drafts') {
    return (
      <>
        <Pencil size={12} />
        <TitleText size={size}>Drafts</TitleText>
      </>
    )
  }
  if (route.key === 'account') {
    return <TitleText size={size}>Account Profile</TitleText>
  }
  if (route.key === 'site') {
    return (
      <TitleText size={size}>{hostnameStripProtocol(route.hostname)}</TitleText>
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

export function Title({size}: {size?: SizeTokens}) {
  return (
    <XStack
      gap="$2"
      alignItems="baseline"
      margin="auto"
      marginVertical={0}
      data-tauri-drag-region
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
  size?: SizeTokens
}) {
  let {data: pub} = usePublication(route.documentId, route.versionId)
  let {data: author} = useAuthor(pub?.document?.author)
  const navigate = useNavigate()

  return (
    <>
      <TitleText size={size}>{pub?.document?.title || '...'}</TitleText>
      <ButtonText
        size="$1"
        onPress={(e) => {
          e.preventDefault()
          const accountId = author?.id
          if (!accountId) return
          navigate({key: 'account', accountId})
        }}
      >
        {author?.profile?.alias || ''}
      </ButtonText>
    </>
  )
}

function DraftTitle({
  route,
  size = '$4',
}: {
  route: DraftRoute
  size?: SizeTokens
}) {
  const {data: draft} = useDraft(route.documentId)
  const displayTitle = draft?.title === '' ? 'Untitled Draft' : draft?.title
  return <TitleText size={size}>{displayTitle}</TitleText>
}
