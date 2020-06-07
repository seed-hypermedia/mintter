import {Switch, Route, useRouteMatch, Redirect} from 'react-router-dom'
import {LibraryHeader} from 'components/library-header'
import Content from 'components/content'
import {PrivateRoute} from 'components/private-route'
import {NavItem} from 'components/nav'
import {Publications} from 'screens/publications'
import {MyPublications} from 'screens/my-publications'

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export function Library(props) {
  const match = useRouteMatch('/library')
  return (
    <Content>
      <LibraryHeader />
      <div className="flex items-center -mx-2">
        <NavItem to="/library/publications">Publications</NavItem>
        <NavItem to="/library/my-publications">My Publications</NavItem>
        <NavItem to="/library/drafts">Drafts</NavItem>
        <div className="flex-1" />
      </div>
      <Switch>
        <PrivateRoute exact path={match.url}>
          <Redirect to={`${match.url}/publications`} />
        </PrivateRoute>
        <PrivateRoute path={`${match.url}/publications`}>
          <Publications />
        </PrivateRoute>
        <PrivateRoute path={`${match.url}/my-publications`}>
          <MyPublications />
        </PrivateRoute>
        <PrivateRoute path={`${match.url}/drafts`}>
          <div>
            <p>Drafts</p>
          </div>
        </PrivateRoute>
      </Switch>
    </Content>
  )
}
