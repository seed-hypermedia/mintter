import {Switch, useRouteMatch, Redirect, useHistory, Route, useParams} from 'react-router-dom'
import {useAccount} from '@mintter/client/hooks'
import {listAccounts, connect, createDraft} from '@mintter/client'
import {Link} from '../components/link'
import {Publications} from './publications'
import {MyPublications} from './my-publications'
import {Drafts} from './drafts'
import {Box, Button, Text} from '@mintter/ui'
import {Separator} from '../components/separator'
import * as MessageBox from '../components/message-box'
import {getPath} from '../utils/routes'
import {Container} from '../components/container'
import type {CSS} from '@mintter/ui/stitches.config'
import {useEffect, useMemo} from 'react'
import toast from 'react-hot-toast'

export type WithCreateDraft = {
  onCreateDraft: () => void
}

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function Library() {
  const {path, url} = useRouteMatch()
  const history = useHistory()
  // const { connectToPeer } = useConnectionCreate();
  async function onCreateDraft() {
    const d = await createDraft()
    if (d?.id) {
      history.push({
        pathname: `${getPath(path)}/editor/${d.id}`,
      })
    } else {
      console.warn(`createDraft Error: "createDraft" does not returned a Document`, d)
    }
  }

  async function onConnect(addressList?: string[]) {
    // TODO: re-enable toasts
    if (addressList) {
      try {
        // await toast.promise(connectToPeer(addressList), {
        //   loading: 'Connecting to peer...',
        //   success: 'Connection Succeeded!',
        //   error: 'Connection Error',
        // })
      } catch (err) {
        console.error(err.message)
      }
    } else {
      console.log('open prompt!')
      const peer: string | null = window.prompt(`enter a peer address`)
      if (peer) {
        try {
          await toast.promise(connect(peer), {
            loading: 'Connecting to peer...',
            success: 'Connection Succeeded!',
            error: 'Connection Error',
          })
          setInterval(() => {
            listAccounts().then((res) => {
              console.log('listAccounts', res)
            })
          }, 2000)
        } catch (err) {
          console.error(err.message)
        }
      }
    }
  }

  return (
    <Box
      data-testid="page"
      css={{
        display: 'grid',
        height: '$full',
        gridTemplateAreas: `"controls controls controls"
        "leftside maincontent rightside"`,
        gridTemplateColumns: 'minmax(300px, 25%) 1fr minmax(300px, 25%)',
        gridTemplateRows: '64px 1fr',
        gap: '$5',
      }}
    >
      <Box
        css={{
          gridArea: 'leftside',
          paddingLeft: '$5',
          display: 'flex',
          flexDirection: 'column',
          gap: '$8',
        }}
      >
        <ProfileInfo />
        <Button onClick={() => onConnect()}>Connect</Button>
      </Box>

      <Container css={{gridArea: 'maincontent'}}>
        <Box
          css={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <Text as="h1" size="9">
            Library
          </Text>
          <Button color="primary" size="2" shape="pill" onClick={onCreateDraft}>
            Compose
          </Button>
        </Box>
        <Box
          as="nav"
          css={{
            display: 'flex',
            gap: '$7',
            marginTop: '$6',
          }}
        >
          <NavItem to={`${url}`} onlyActiveWhenExact>
            Feed
          </NavItem>
          <NavItem to={`${url}/published`}>Published</NavItem>
          <NavItem to={`${url}/drafts`}>Drafts</NavItem>
        </Box>
        <Separator />
        {/* <NoConnectionsBox onConnect={onConnect} /> */}

        <Switch>
          <Route exact path={path}>
            <Publications onCreateDraft={onCreateDraft} />
          </Route>
          <Route path={`${path}/:tab`}>
            <NestedTabs onCreateDraft={onCreateDraft} />
          </Route>
        </Switch>
      </Container>
    </Box>
  )
}

function NestedTabs({onCreateDraft}) {
  const {tab} = useParams()

  if (tab == 'published') {
    return <MyPublications onCreateDraft={onCreateDraft} />
  }

  if (tab == 'drafts') {
    return <Drafts onCreateDraft={onCreateDraft} />
  }
}

function ProfileInfo() {
  const {path} = useRouteMatch()
  const {data, isError, error, isLoading, isSuccess} = useAccount()

  if (isLoading) {
    return <Text>loading...</Text>
  }

  if (isError) {
    console.error('ProfileInfo error: ', error)
    return <Text>Error...</Text>
  }

  return data?.profile ? (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '$5',
        alignItems: 'flex-start',
      }}
    >
      <Text
        as="h3"
        size="7"
        // TODO: fix types
        // @ts-ignore
        css={{fontWeight: '$bold'}}
      >
        {data.profile.alias}
      </Text>
      <Text>{data.profile.bio}</Text>
      <Button
        // TODO: fix types
        // @ts-ignore
        as={Link}
        variant="outlined"
        color="primary"
        size="1"
        to={`${getPath(path)}/settings`}
      >
        Edit profile
      </Button>
    </Box>
  ) : null
}

const NoConnectionsBox: React.FC<{onConnect: () => void}> = ({onConnect}: any) => {
  const data = []
  return data.length === 0 ? (
    <MessageBox.Root>
      <MessageBox.Title>Connect to Others</MessageBox.Title>
      <MessageBox.Button onClick={() => onConnect()}>
        <span>Add your first connection</span>
      </MessageBox.Button>
    </MessageBox.Root>
  ) : null
}

export type NavItemProps = {
  children: React.ReactNode
  to: string
  css?: CSS
  onlyActiveWhenExact?: boolean
}

// TODO: fix types
function NavItem({children, to, css, onlyActiveWhenExact = false, ...props}: NavItemProps) {
  const match = useRouteMatch({
    path: to,
    exact: onlyActiveWhenExact,
  })

  const active = useMemo(() => match?.path === to, [match?.path, to])

  return (
    <Text
      // TODO: fix types
      // @ts-ignore
      as={Link}
      size="5"
      to={to}
      // TODO: fix types
      // @ts-ignore
      css={{
        textDecoration: 'none',
        color: active ? '$primary-default' : '$text-default',
        fontWeight: active ? '$bold' : '$regular',
      }}
      {...props}
    >
      {children}
    </Text>
  )
}
