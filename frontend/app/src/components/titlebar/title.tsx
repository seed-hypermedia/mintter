import {DraftActor} from '@app/draft-machine'
import {useMain} from '@app/main-context'
import {PublicationActor} from '@app/publication-machine'
import {useSelector} from '@xstate/react'
import {Route, Switch} from 'wouter'

export function Title() {
  const mainService = useMain()
  const current = useSelector(mainService, (state) => state.context.current)

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
        <Route path="/p/:id/:version/:block?">
          {current ? (
            <PublicationTitle publication={current as PublicationActor} />
          ) : (
            <>...</>
          )}
        </Route>
        <Route path="/d/:id/:tag?">
          {current ? <DraftTitle draft={current as DraftActor} /> : <>...</>}
        </Route>
      </Switch>
    </h1>
  )
}

function PublicationTitle({publication}: {publication: PublicationActor}) {
  const title = useSelector(publication, (state) => state.context.title)
  const alias = useSelector(
    publication,
    (state) => state.context.author?.profile?.alias,
  )

  return (
    <>
      <span data-tauri-drag-region>{title}</span>
      <small data-tauri-drag-region>{alias}</small>
    </>
  )
}

function DraftTitle({draft}: {draft: DraftActor}) {
  const title = useSelector(draft, (state) => state.context.title)

  return <span data-tauri-drag-region>{title}</span>
}
