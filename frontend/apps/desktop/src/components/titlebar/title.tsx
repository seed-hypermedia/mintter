import {useAuthor, useDraft, usePublication} from '@app/hooks'
import {
  DraftRoute,
  PublicationRoute,
  useNavRoute,
  useNavigate,
} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {TitleText, XStack} from '@mintter/ui'

export function TitleContent() {
  const route = useNavRoute()
  if (route.key === 'home') {
    return (
      <>
        <Icon name="File" />
        <TitleText>All Publications</TitleText>
      </>
    )
  }
  if (route.key === 'connections') {
    return (
      <>
        <Icon name="Person" />
        <TitleText>Connections</TitleText>
      </>
    )
  }
  if (route.key === 'drafts') {
    return (
      <>
        <Icon name="PencilAdd" data-tauri-drag-region />
        <TitleText>Drafts</TitleText>
      </>
    )
  }
  if (route.key === 'account') {
    return <TitleText>Account Profile</TitleText>
  }
  if (route.key === 'site') {
    return <TitleText>{hostnameStripProtocol(route.hostname)}</TitleText>
  }
  if (route.key === 'publication') {
    return <PublicationTitle route={route} />
  }
  if (route.key === 'draft') {
    return <DraftTitle route={route} />
  }
  return null
}

export function Title() {
  return (
    <XStack gap="$2" alignItems="baseline" margin="auto">
      <TitleContent />
    </XStack>
  )
}

function PublicationTitle({route}: {route: PublicationRoute}) {
  let {data: pub} = usePublication(route.documentId, route.versionId)
  let {data: author} = useAuthor(pub?.document?.author)
  const navigate = useNavigate()

  return (
    <>
      <TitleText>{pub?.document?.title || '...'}</TitleText>
      <Button
        css={{
          color: '$base-active',
          fontSize: '$1',
          '&:hover': {
            color: '$base-active',
            textDecoration: 'underline',
          },
        }}
        size="1"
        variant="ghost"
        onClick={(e) => {
          e.preventDefault()
          const accountId = author?.id
          if (!accountId) return
          navigate({key: 'account', accountId})
        }}
      >
        {author?.profile?.alias || ''}
      </Button>
    </>
  )
}

function DraftTitle({route}: {route: DraftRoute}) {
  const {data: draft} = useDraft(route.documentId)
  const displayTitle = draft?.title === '' ? 'Untitled Draft' : draft?.title
  return <TitleText>{displayTitle}</TitleText>
}
