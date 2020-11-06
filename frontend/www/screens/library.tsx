import React from 'react'
import {css} from 'emotion'
import {Switch, useRouteMatch, Redirect} from 'react-router-dom'
import {PrivateRoute} from 'components/routes'
import {NavItem} from 'components/nav'
import {useHistory} from 'react-router-dom'
import {useMintter} from 'shared/mintterContext'
import {
  useConnectionList,
  useConnectionCreate,
  useProfile,
} from 'shared/profileContext'
import {Link} from 'components/link'
import {Connections} from 'components/connections'
import {SuggestedConnections} from 'components/suggested-connections'
import {Page} from 'components/page'
import {MainColumn} from 'components/main-column'
import {Icons} from '@mintter/editor'
import {useToasts} from 'react-toast-notifications'

const Publications = React.lazy(() =>
  import(/* webpackPrefetch: true */ './publications'),
)
const MyPublications = React.lazy(() =>
  import(/* webpackPrefetch: true */ './my-publications'),
)
const Drafts = React.lazy(() => import(/* webpackPrefetch: true */ './drafts'))

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function Library() {
  const match = useRouteMatch('/private/library')
  const history = useHistory()
  const {createDraft} = useMintter()
  const {
    data: connections,
    isLoading: isConnectionsLoading,
  } = useConnectionList()
  const {connectToPeer} = useConnectionCreate()
  const {addToast, updateToast, removeToast} = useToasts()

  async function handleCreateDocument() {
    const d = await createDraft()
    const value = d.toObject()
    history.push({
      pathname: `/private/editor/${value.version}`,
    })
  }

  async function handleConnectToPeer() {
    const peer: any = window.prompt(`enter a peer address`)

    if (peer) {
      const toast = addToast('Connecting to peer...', {
        appearance: 'info',
        autoDismiss: false,
      })
      try {
        await connectToPeer(peer.split(','))
        updateToast(toast, {
          content: 'Connection established successfuly!',
          appearance: 'success',
          autoDismiss: true,
        })
      } catch (err) {
        removeToast(toast, () => {
          addToast(err.message, {
            appearance: 'error',
          })
        })
      }
    }
  }

  if (isConnectionsLoading) {
    return null
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
          <Connections
            handleConnectToPeer={handleConnectToPeer}
            connections={connections}
            isLoading={isConnectionsLoading}
          />
          <SuggestedConnections handleConnectToPeer={handleConnectToPeer} />
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
              <NavItem to="/private/library/feed">Feed</NavItem>
              <NavItem to="/private/library/published">Published</NavItem>
              <NavItem to="/private/library/drafts">Drafts</NavItem>
              <div className="flex-1" />
            </div>
            {connections.length === 0 && (
              <>
                <hr className="border-t-2 border-muted border-solid my-8" />
                <div className="bg-background-muted border-muted border-solid border-2 rounded px-4 py-4 mb-4 text-center flex flex-col items-center">
                  <h3 className="text-xl font-bold text-primary">
                    Connect to Others
                  </h3>
                  {/* <p className="text-body font-light mt-5">
                    Some clain sentence that's fun, welcomes user to the community
                    and tells how it works and encourages to get started
                  </p> */}
                  <button
                    onClick={handleConnectToPeer}
                    className="bg-primary hover:shadow-lg text-white font-bold py-3 px-4 rounded-full flex items-center mt-5 justify-center"
                  >
                    <Icons.Plus />
                    <span className="ml-2">Add your First Connection</span>
                  </button>
                </div>
              </>
            )}
            <div className="-mx-4 mt-4">
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

  return profile ? (
    <div className="text-left px-4">
      <h3 className="font-semibold text-2xl text-heading">
        {profile.username}
      </h3>
      <p className="text-body text-sm mt-2">{profile.bio}</p>
      <Link
        to="/private/settings"
        className="text-primary hover:text-primary-hover cursor-pointer text-sm mt-4 underline inline-block"
      >
        Edit profile
      </Link>
    </div>
  ) : null
}
