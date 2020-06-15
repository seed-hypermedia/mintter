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
import {ErrorMessage} from 'components/errorMessage'
import {css} from 'emotion'

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
          <div className="flex-1" />
          <button
            onClick={handleCreateDocument}
            className="bg-info hover:bg-info-hover text-white font-bold py-2 px-4 rounded rounded-full flex items-center justify-center transition duration-100"
          >
            new Document
          </button>
        </div>
        <div className="flex items-center">
          <NavItem to="/library/feed">Your Feed</NavItem>
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

  const values = profile.toObject()

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

function Connections() {
  const {connectToPeerById, allConnections} = useMintter()

  async function handlePeerConnection() {
    const peer = window.prompt(`enter a peer address`)
    await connectToPeerById([peer])
  }

  const {status, error, resolvedData} = allConnections()

  if (status === 'loading') {
    return <p className="text-body text-sm mt-2">loading...</p>
  }

  if (status === 'error') {
    return <ErrorMessage error={error} />
  }

  return (
    <div
      className={`pt-10 px-4 lg:pl-20 lg:pr-16 ${css`
        max-width: 300px;
        width: 100%;
      `}`}
    >
      <h3 className="font-semibold text-xl text-heading">Connections</h3>
      <ul>
        {resolvedData?.toObject().profilesList.map(c => (
          <>
            <li className="text-body text-sm mt-2 flex items-center">
              <div className="w-6 h-6 bg-body-muted rounded-full mr-2 flex-none" />
              <a className="text-primary hover:text-primary-hover cursor-pointer text-sm hover:underline hover:cursor-not-allowed truncate">
                {c.username}
              </a>
            </li>
          </>
        ))}
      </ul>
      <button
        onClick={handlePeerConnection}
        className="text-primary hover:text-primary-hover cursor-pointer text-sm mt-4 underline"
      >
        + add connection
      </button>
    </div>
  )
}
