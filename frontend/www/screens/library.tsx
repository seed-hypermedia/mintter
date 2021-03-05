import React from 'react'
import {css} from 'emotion'
import {Switch, useRouteMatch, Redirect} from 'react-router-dom'
import {PrivateRoute, getPath} from 'components/routes'
import {NavItem} from 'components/nav'
import {useHistory} from 'react-router-dom'
import {useMintter} from 'shared/mintter-context'
import {
  useConnectionCreate,
  useConnectionList,
  useProfile,
} from 'shared/profile-context'
import {Text} from 'components/text'
import {Box} from 'components/box'
import {Link} from 'components/link'
import {Connections} from 'components/connections'
import {SuggestedConnections} from 'components/suggested-connections'
import {Page} from 'components/page'
import {MainColumn} from 'components/main-column'
import {Icons} from 'components/icons'
import {useToasts} from 'react-toast-notifications'
import Publications from './publications'
import MyPublications from './my-publications'
import Drafts from './drafts'
import {Button} from 'components/button'
import {Heading} from 'components/heading'

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function Library() {
  const match = useRouteMatch()
  const history = useHistory()
  const {createDraft} = useMintter()
  const {connectToPeer} = useConnectionCreate()
  const {addToast, updateToast, removeToast} = useToasts()

  async function onCreateDocument() {
    const d = await createDraft()
    const value = d.toObject()
    history.push({
      pathname: `${getPath(match)}/editor/${value.version}`,
    })
  }

  async function onConnect(addressList?: string[]) {
    if (addressList) {
      const toast = addToast('Connecting to peer...', {
        appearance: 'info',
        autoDismiss: false,
      })
      try {
        await connectToPeer(addressList)
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
    } else {
      const peer: string = window.prompt(`enter a peer address`)
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
  }

  return (
    <Page>
      <div
        className={`grid gap-4 grid-flow-col ${css`
          grid-template-columns: minmax(250px, 25%) 1fr minmax(250px, 25%);
        `}`}
      >
        <div className="pt-16 px-4 md:pl-16 mb-20">
          <ProfileInfo />
          <Connections onConnect={onConnect} />
          <SuggestedConnections onConnect={onConnect} />
        </div>
        <div>
          <MainColumn className="pt-12">
            <Box
              css={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Heading as="h1">Library</Heading>
              {/* <div className="flex-1" /> */}
              <Button
                variant="primary"
                size="2"
                appearance="pill"
                onClick={onCreateDocument}
              >
                Compose
              </Button>
            </Box>
            <Box
              css={{
                mx: '-$3',
                marginTop: '$2',
                display: 'inline-flex',
                gap: '$1',
              }}
            >
              <NavItem to={`${match.url}/feed`}>Feed</NavItem>
              <NavItem to={`${match.url}/published`}>Published</NavItem>
              <NavItem to={`${match.url}/drafts`}>Drafts</NavItem>
            </Box>
            <NoConnectionsBox onConnect={onConnect} />
            <div>
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
  const match = useRouteMatch()
  const {data: profile} = useProfile()

  return profile ? (
    <div className="text-left">
      <h3 className="font-semibold text-2xl text-heading">
        {profile.username}
      </h3>
      <p className="text-body text-sm mt-2">{profile.bio}</p>
      <Box css={{marginTop: '$4', mx: '-$2'}}>
        <Button
          as={Link}
          variant="primary"
          appearance="plain"
          to={`${getPath(match)}/settings`}
          css={{height: '$5'}}
        >
          edit profile
        </Button>
      </Box>
    </div>
  ) : null
}

function NoConnectionsBox({onConnect}) {
  const {data = []} = useConnectionList()
  return data.length === 0 ? (
    <Box
      css={{
        bc: '$gray200',
        p: '$6',
        marginTop: '$4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRadius: '$3',
        boxShadow: 'inset 0 0 0 1px $colors$gray400, 0 0 0 1px $colors$gray400',
      }}
    >
      <h3 className="text-xl font-bold text-primary">Connect to Others</h3>
      {/* <p className="text-body font-light mt-5">
          Some clain sentence that's fun, welcomes user to the community
          and tells how it works and encourages to get started
        </p> */}
      <Button
        onClick={() => onConnect()}
        appearance="pill"
        variant="primary"
        css={{
          height: '$7',
          fontSize: '$3',
          marginTop: '$4',
          px: '$4',
        }}
      >
        <Icons.Plus />
        <Text color="white" size="3">
          Add your First Connection
        </Text>
      </Button>
    </Box>
  ) : null
}
