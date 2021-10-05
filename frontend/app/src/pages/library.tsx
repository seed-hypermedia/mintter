import {createDraft} from '@mintter/client'
import {useAccount, useMyPublicationsList, useOthersPublicationsList} from '@mintter/client/hooks'
import {Box} from '@mintter/ui/box'
import {Button, buttonStyles} from '@mintter/ui/button'
import type {CSS} from '@mintter/ui/stitches.config'
import {styled} from '@mintter/ui/stitches.config'
import {Text, textStyles} from '@mintter/ui/text'
import {PropsWithChildren, useCallback} from 'react'
import {Route, Switch, useHistory, useRouteMatch} from 'react-router-dom'
import {Container} from '../components/container'
import {Link} from '../components/link'
import * as MessageBox from '../components/message-box'
import {Separator} from '../components/separator'
import {Connections} from '../connections'
import {DraftListPage, ListPage} from './list-page'

export default function Library() {
  const {path, url} = useRouteMatch()
  const history = useHistory()
  // const { connectToPeer } = useConnectionCreate();

  const onCreateDraft = useCallback(async () => {
    try {
      const d = await createDraft()
      if (d?.id) {
        history.push({
          pathname: `/editor/${d.id}`,
        })
      }
    } catch (err) {
      console.warn(`createDraft Error: "createDraft" does not returned a Document`, err)
    }
  }, [])

  return (
    <Box
      data-testid="page"
      css={{
        display: 'grid',
        height: '$full',
        gridTemplateAreas: `"controls controls controls"
        "leftside maincontent rightside"`,
        '@bp1': {
          gridTemplateColumns: 'minmax(200px, 25%) 1fr minmax(200px, 25%)',
        },
        '@bp2': {
          gridTemplateColumns: 'minmax(350px, 25%) 1fr minmax(350px, 25%)',
        },
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
        <Connections />
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
        <Switch>
          <Route exact path={path}>
            <ListPage onCreateDraft={onCreateDraft} useDataHook={useOthersPublicationsList} />
          </Route>
          <Route
            path={`${path}/published`}
            render={() => {
              return <ListPage onCreateDraft={onCreateDraft} useDataHook={useMyPublicationsList} />
            }}
          />
          <Route
            path={`${path}/drafts`}
            render={() => {
              return <DraftListPage onCreateDraft={onCreateDraft} />
            }}
          />
        </Switch>
      </Container>
    </Box>
  )
}

const ButtonLinkStyled = styled(Link, buttonStyles)

function ProfileInfo() {
  const {status, data, error} = useAccount()

  if (status == 'loading') {
    return <Text>loading...</Text>
  }

  if (status == 'error') {
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
      <Box
        css={{
          width: 80,
          height: 80,
          borderRadius: '$round',
          background: '$background-neutral-soft',
        }}
      />
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
      <ButtonLinkStyled variant="outlined" color="primary" size="1" to="/settings">
        Edit profile
      </ButtonLinkStyled>
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
  to: string
  css?: CSS
  onlyActiveWhenExact?: boolean
}

const NavItemStyled = styled(Link, textStyles, {
  textDecoration: 'none',
})

function NavItem({children, to, css, onlyActiveWhenExact = false, ...props}: PropsWithChildren<NavItemProps>) {
  const match = useRouteMatch({
    path: to,
    exact: onlyActiveWhenExact,
  })

  let active = match?.path === to

  return (
    <NavItemStyled
      size="5"
      to={to}
      css={{
        color: active ? '$primary-default' : '$text-default',
        fontWeight: active ? '$bold' : '$regular',
      }}
      {...props}
    >
      {children}
    </NavItemStyled>
  )
}
