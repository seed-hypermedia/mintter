import {queryKeys, useAuthor} from '@app/hooks'
import {tauriDecodeParam} from '@app/utils/tauri-param-hackaround'
import {getDraft, getPublication} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {listen} from '@tauri-apps/api/event'
import {useEffect} from 'react'
import {Route, ExtractRouteParams, Switch, useRoute} from 'wouter'

export function Title() {
  let [, siteHomeParams] = useRoute('/sites/:hostname')

  return (
    <h1
      className="titlebar-title"
      data-testid="titlebar-title"
      data-tauri-drag-region
    >
      <Switch>
        <Route path="/">
          <span data-tauri-drag-region>Inbox</span>
        </Route>
        <Route path="/inbox">
          <span data-tauri-drag-region>Inbox</span>
        </Route>
        <Route path="/drafts">
          <span data-tauri-drag-region>Drafts</span>
        </Route>
        <Route path="/sites/:hostname">
          <span data-tauri-drag-region>
            {tauriDecodeParam(siteHomeParams?.hostname)}
          </span>
        </Route>

        <Route path="/p/:id/:version/:block?" component={PublicationTitle} />
        <Route path="/d/:id/:tag?" component={DraftTitle} />
      </Switch>
    </h1>
  )
}

function PublicationTitle({
  params,
}: {
  params: ExtractRouteParams<'/p/:id/:version/:block?'>
}) {
  let {data: pub} = useQuery({
    queryKey: [queryKeys.GET_PUBLICATION, params.id, params.version],
    enabled: !!params.id,
    queryFn: () => getPublication(params.id, params.version),
  })

  let {data: author} = useAuthor(pub?.document?.author)

  return (
    <>
      <span data-tauri-drag-region>{pub?.document?.title || '...'}</span>
      <small data-tauri-drag-region>{author?.profile?.alias || ''}</small>
    </>
  )
}

function DraftTitle({params}: {params: ExtractRouteParams<'/d/:id/:tag?'>}) {
  let {data: draft, refetch} = useQuery({
    queryKey: [queryKeys.GET_DRAFT, params.id],
    enabled: !!params.id,
    queryFn: () => getDraft(params.id),
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
