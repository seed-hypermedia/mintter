import {draftsClient} from '@app/api-clients'
import {queryKeys, useAuthor, useDraft, usePublication} from '@app/hooks'
import {
  DraftRoute,
  PublicationRoute,
  useNavigate,
  useNavRoute,
} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {useQuery} from '@tanstack/react-query'
import {listen} from '@tauri-apps/api/event'
import {useEffect} from 'react'

export function TitleContent() {
  const route = useNavRoute()
  if (route.key === 'home') {
    return (
      <>
        <Icon name="File" />
        <Text css={{marginInline: '$3'}}>All Publications</Text>
      </>
    )
  }
  if (route.key === 'connections') {
    return (
      <>
        <Icon name="Person" />
        <Text css={{marginInline: '$3'}}>Connections</Text>
      </>
    )
  }
  if (route.key === 'drafts') {
    return (
      <>
        <Icon name="PencilAdd" />
        <Text css={{marginInline: '$3'}}>Drafts</Text>
      </>
    )
  }
  if (route.key === 'account') {
    return <>Account Profile</>
  }
  if (route.key === 'site') {
    return <>{hostnameStripProtocol(route.hostname)}</>
  }
  if (route.key === 'publication') {
    return <PublicationTitle route={route} />
  }
  if (route.key === 'draft') {
    return <DraftTitle route={route} />
  }
  return <>{null}</>
}

export function Title() {
  return (
    <h1
      className="titlebar-title"
      data-testid="titlebar-title"
      data-tauri-drag-region
    >
      <TitleContent />
    </h1>
  )
}

function PublicationTitle({route}: {route: PublicationRoute}) {
  let {data: pub} = usePublication(route.documentId, route.versionId)
  let {data: author} = useAuthor(pub?.document?.author)
  const navigate = useNavigate()

  return (
    <>
      <span data-tauri-drag-region>{pub?.document?.title || '...'}</span>
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
  return <span data-tauri-drag-region>{displayTitle}</span>
}
