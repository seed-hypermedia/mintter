import {draftsClient} from '@app/api-clients'
import {queryKeys, useAuthor, usePublication} from '@app/hooks'
import {DraftRoute, PublicationRoute, useNavRoute} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
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

  return (
    <>
      <span data-tauri-drag-region>{pub?.document?.title || '...'}</span>
      <small data-tauri-drag-region>{author?.profile?.alias || ''}</small>
    </>
  )
}

function DraftTitle({route}: {route: DraftRoute}) {
  let {data: draft, refetch} = useQuery({
    queryKey: [queryKeys.GET_DRAFT, route.documentId],
    enabled: !!route.documentId,
    queryFn: () => draftsClient.getDraft({documentId: route.documentId}),
  })

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    listen('update_draft', () => {
      refetch()

      if (!isSubscribed) {
        return unlisten()
      }
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  return <span data-tauri-drag-region>{draft?.title}</span>
}
