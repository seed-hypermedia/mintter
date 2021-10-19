import {createDraft} from '@mintter/client'
import {useAccount, useMyPublicationsList, useOthersPublicationsList} from '@mintter/client/hooks'
import {Box} from '@mintter/ui/box'
import {Button, buttonStyles} from '@mintter/ui/button'
import type {CSS} from '@mintter/ui/stitches.config'
import {styled} from '@mintter/ui/stitches.config'
import {Text, textStyles} from '@mintter/ui/text'
import {getCurrent as getCurrentWindow} from '@tauri-apps/api/window'
import {PropsWithChildren, useCallback, useEffect} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Link, Route, Switch, useLocation, useRoute} from 'wouter'
import {AppError} from '../app'
import {Connections} from '../components/connections'
import {Container} from '../components/container'
import * as MessageBox from '../components/message-box'
import {Separator} from '../components/separator'
import {DraftListPage, ListPage} from './list-page'

export default function Library() {
  const [, setLocation] = useLocation()

  useEffect(() => {
    getCurrentWindow().setTitle('Library')
  })

  const onCreateDraft = useCallback(async () => {
    try {
      const d = await createDraft()
      if (d?.id) {
        setLocation(`/editor/${d.id}`)
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
          <NavItem href="/library">Feed</NavItem>
          <NavItem href="/library/published">Published</NavItem>
          <NavItem href="/library/drafts">Drafts</NavItem>
        </Box>
        <Separator />
        <Switch>
          <Route path="/library">
            <ListPage onCreateDraft={onCreateDraft} useDataHook={useOthersPublicationsList} />
          </Route>
          <Route path="/library/published">
            <ListPage onCreateDraft={onCreateDraft} useDataHook={useMyPublicationsList} />
          </Route>
          <Route path="/library/drafts">
            <ErrorBoundary FallbackComponent={AppError} onReset={() => window.location.reload()}>
              <DraftListPage onCreateDraft={onCreateDraft} />
            </ErrorBoundary>
          </Route>
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
  href: string
  css?: CSS
  onlyActiveWhenExact?: boolean
}

const NavItemStyled = styled(Link, textStyles, {
  textDecoration: 'none',
})

function NavItem({children, href, css, onlyActiveWhenExact = false, ...props}: PropsWithChildren<NavItemProps>) {
  const [active] = useRoute(href)

  return (
    <NavItemStyled
      size="5"
      href={href}
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
