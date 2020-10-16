import React from 'react'
import {css} from 'emotion'
import {Switch, useRouteMatch, Redirect} from 'react-router-dom'
import {PrivateRoute} from 'components/routes'
import {NavItem} from 'components/nav'
import {useHistory} from 'react-router-dom'
import {useMintter, useDocuments} from 'shared/mintterContext'
import Container from 'components/container'
import {useProfile} from 'shared/profileContext'
import {Link} from 'components/link'
import {Connections} from 'components/connections'
import {SuggestedConnections} from 'components/suggested-connections'
import {Page} from 'components/page'
import {MainColumn} from 'components/main-column'

const Publications = React.lazy(() =>
  import(/* webpackPrefetch: true */ './publications'),
)
const MyPublications = React.lazy(() =>
  import(/* webpackPrefetch: true */ './my-publications'),
)
const Drafts = React.lazy(() => import(/* webpackPrefetch: true */ './drafts'))

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function Library(props) {
  const match = useRouteMatch('/library')
  const history = useHistory()
  const {createDraft} = useMintter()

  async function handleCreateDocument() {
    const d = await createDraft()

    const value = d.toObject()
    history.push({
      pathname: `/editor/${value.version}`,
    })
  }

  return (
    <Page>
      <div
        className={`grid gap-4 ${css`
          grid-template-columns: minmax(250px, 25%) 1fr minmax(250px, 25%);
        `}`}
      >
        <div className="pt-16">
          <ProfileInfo />
          <Connections />
          <SuggestedConnections />
        </div>
        <div>
          <MainColumn>
            <div className="flex items-baseline justify-between">
              <h1 className="text-4xl font-bold text-heading">Library</h1>
              <div className="flex-1" />
              <button
                onClick={handleCreateDocument}
                className="bg-primary rounded-full px-4 py-2 text-white font-bold shadow transition duration-200 hover:shadow-lg ml-4"
              >
                Compose
              </button>
            </div>
            <div className="flex items-center mt-4 -mx-4">
              <NavItem to="/library/feed">Feed</NavItem>
              <NavItem to="/library/published">Published</NavItem>
              <NavItem to="/library/drafts">Drafts</NavItem>
              <div className="flex-1" />
            </div>
            <div className="-mx-4">
              <Switch>
                <PrivateRoute exact path={match.url}>
                  <Redirect to={`${match.url}/feed`} />
                </PrivateRoute>
                <PrivateRoute path={`${match.url}/feed`}>
                  <Publications />
                </PrivateRoute>
                <PrivateRoute path={`${match.url}/published`}>
                  <MyPublications />
                </PrivateRoute>
                <PrivateRoute path={`${match.url}/drafts`}>
                  <Drafts />
                </PrivateRoute>
              </Switch>
            </div>
          </MainColumn>
        </div>
        <div />
      </div>
    </Page>
  )
}

function ProfileInfo() {
  const {data: profile} = useProfile()

  return (
    profile && (
      <div className="text-left px-4">
        <h3 className="font-semibold text-2xl text-heading">
          {profile.username}
        </h3>
        <p className="text-body text-sm mt-2">{profile.bio}</p>
        <Link
          to="/settings"
          className="text-primary hover:text-primary-hover cursor-pointer text-sm mt-4 underline inline-block"
        >
          Edit profile
        </Link>
      </div>
    )
  )
}
