import {Switch, useRouteMatch, Redirect} from 'react-router-dom'
import {PrivateRoute} from 'components/routes'
import {NavItem} from 'components/nav'
import {Publications} from 'screens/publications'
import {MyPublications} from 'screens/my-publications'
import {useHistory} from 'react-router-dom'
import {useMintter} from 'shared/mintterContext'
import {Drafts} from './drafts'
import Container from 'components/container'
import {useProfile} from 'shared/profileContext'
import {Link} from 'components/link'
import {Connections} from 'components/connections'

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function Library(props) {
  const match = useRouteMatch('/library')
  const history = useHistory()
  const {createDraft} = useMintter()

  async function handleCreateDocument() {
    const d = await createDraft()

    const value = d.toObject()
    history.push({
      pathname: `/editor/${value.documentId}`,
    })
  }

  return (
    <div className="w-full flex relative px-4">
      <div className="flex-1">
        <ProfileInfo />
        <Connections />
      </div>
      <Container>
        <div className="py-5 flex items-baseline justify-between">
          <h1 className="py-5 text-4xl font-bold text-heading">Library</h1>
          <div className="flex-1" />
          <button
            onClick={handleCreateDocument}
            className="bg-info hover:bg-info-hover text-white font-bold py-2 px-4 rounded flex items-center justify-center transition duration-100"
          >
            new Document
          </button>
        </div>
        <div className="flex items-center">
          <NavItem to="/library/feed">Feed</NavItem>
          <NavItem to="/library/published">Published</NavItem>
          <NavItem to="/library/drafts">Drafts</NavItem>
          <div className="flex-1" />
        </div>
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
      </Container>
      <div className="flex-1"></div>
    </div>
  )
}

function ProfileInfo() {
  const {profile} = useProfile()

  const values = profile?.toObject()

  return (
    values && (
      <div className="text-left pt-16 px-4 lg:pl-20 lg:pr-16">
        <h3 className="font-semibold text-2xl text-heading">
          {values.username}
        </h3>
        <p className="text-body text-sm mt-2">{values.bio}</p>
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
