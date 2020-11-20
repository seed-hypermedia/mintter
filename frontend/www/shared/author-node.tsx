import React from 'react'
import {Switch, Route, Redirect, useRouteMatch} from 'react-router-dom'

export default function AuthorNode({path = '/'}) {
  const match = useRouteMatch(path)
  console.log('AuthorNode -> match', match)

  return (
    <Switch>
      <Route exact path={match.url}>
        <Redirect
          to={`${match.url}${match.url === '/' ? '' : '/'}library/feed`}
        />
      </Route>
    </Switch>
  )
}
