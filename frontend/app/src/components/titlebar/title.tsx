import {DraftActor} from '@app/draft-machine'
import {useMain} from '@app/main-context'
import {PublicationActor} from '@app/publication-machine'
import {useSelector} from '@xstate/react'
import {Route, Switch} from 'wouter'

export function Title() {
  const mainService = useMain()
  const current = useSelector(mainService, (state) => state.context.current)

  return (
    <h1 id="titlebar-title" data-testid="titlebar-title" data-tauri-drag-region>
      <Switch>
        <Route path="/">Inbox</Route>
        <Route path="/inbox">Inbox</Route>
        <Route path="/drafts">Drafts</Route>
        <Route path="/p/:id/:version/:block?">
          {current ? (
            <PublicationTitle fileRef={current as PublicationActor} />
          ) : (
            <>...</>
          )}
        </Route>
        <Route path="/d/:id">
          {current ? <DraftTitle fileRef={current as DraftActor} /> : <>...</>}
        </Route>
      </Switch>
    </h1>
  )
}

function PublicationTitle({fileRef}: {fileRef: PublicationActor}) {
  const title = useSelector(fileRef, (state) => state.context.title)
  const alias = useSelector(
    fileRef,
    (state) => state.context.author?.profile?.alias,
  )

  return (
    <>
      {title}
      <small>{alias}</small>
    </>
  )
}

function DraftTitle({fileRef}: {fileRef: DraftActor}) {
  const title = useSelector(fileRef, (state) => state.context.title)

  return <>{title}</>
}
