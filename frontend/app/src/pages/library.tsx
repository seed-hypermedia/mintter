import React from 'react';
import {
  Switch,
  useRouteMatch,
  Redirect,
  useHistory,
  Route,
} from 'react-router-dom';
import {
  useAccount,
  useConnectionCreate,
} from '@mintter/hooks';
import { createDraft } from '@mintter/client';
import { Link } from '../link';
import { Connections } from '../connections';
import { SuggestedConnections } from '../suggested-connections';
import { MainColumn } from '../main-column';
// import { Icons } from 'components/icons';
import { Publications } from './publications';
import { MyPublications } from './my-publications';
import { Drafts } from './drafts';
import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';
import { Text } from '@mintter/ui/text';
import { Separator } from '@components/separator';
import * as MessageBox from '@components/message-box';
import { getPath } from '@utils/routes';
import { Container } from '@components/container';
import type { CSS } from '@mintter/ui/stitches.config';

export type WithCreateDraft = {
  onCreateDraft: () => void;
};

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function Library() {
  const match = useRouteMatch();
  const history = useHistory();
  // const { connectToPeer } = useConnectionCreate();
  // const { addToast, updateToast, removeToast } = useToasts();

  async function onCreateDraft() {
    const d = await createDraft();
    history.push({
      pathname: `${getPath(match)}/editor/${d.getId()}`,
    });
  }

  async function onConnect(addressList?: string[]) {
    // TODO: re-enable toasts
    if (addressList) {
      // const toast = addToast('Connecting to peer...', {
      //   appearance: 'info',
      //   autoDismiss: false,
      // });
      try {
        // await connectToPeer(addressList);
        // updateToast(toast, {
        //   content: 'Connection established successfuly!',
        //   appearance: 'success',
        //   autoDismiss: true,
        // });
      } catch (err) {
        // removeToast(toast, () => {
        //   addToast(err.message, {
        //     appearance: 'error',
        //   });
        // });
      }
    } else {
      const peer: string | null = window.prompt(`enter a peer address`);
      if (peer) {
        // const toast = addToast('Connecting to peer...', {
        //   appearance: 'info',
        //   autoDismiss: false,
        // });
        try {
          // await connectToPeer(peer.split(','));

          // updateToast(toast, {
          //   content: 'Connection established successfuly!',
          //   appearance: 'success',
          //   autoDismiss: true,
          // });
        } catch (err) {
          // removeToast(toast, () => {
          //   addToast(err.message, {
          //     appearance: 'error',
          //   });
          // });
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
        {/* <Connections onConnect={onConnect} /> */}
        {/* <SuggestedConnections onConnect={onConnect} /> */}
      </Box>

      <Container css={{ gridArea: 'maincontent' }}>
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
          <NavItem to={`${match.url}/feed`}>Feed</NavItem>
          <NavItem to={`${match.url}/published`}>Published</NavItem>
          <NavItem to={`${match.url}/drafts`}>Drafts</NavItem>
        </Box>
        <Separator />
        {/* <NoConnectionsBox onConnect={onConnect} /> */}

        <Switch>
          <Route exact path={match.url}>
            <Redirect to={`${match.url}/feed`} />
          </Route>
          <Route path={`${match.url}/feed`}>
            <Publications onCreateDraft={onCreateDraft} />
          </Route>
          <Route path={`${match.url}/published`}>
            <MyPublications onCreateDraft={onCreateDraft} />
          </Route>
          <Route path={`${match.url}/drafts`}>
            <Drafts onCreateDraft={onCreateDraft} />
          </Route>
        </Switch>
      </Container>
    </Box>
  );
}

function ProfileInfo() {
  const match = useRouteMatch();
  const { data, isError, error, isLoading, isSuccess}= useAccount();
  
  if (isLoading) {
    return <Text>loading...</Text>
  }

  if (isError) {
    console.error('ProfileInfo error: ', error)
    return <Text>Error...</Text>
  }

  const { profile } = data
  console.log("🚀 ~ file: library.tsx ~ line 187 ~ ProfileInfo ~ data", data)
  
  return profile ? (
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
        css={{ fontWeight: '$bold' }}
      >
        {profile.alias}
      </Text>
      <Text>{profile.bio}</Text>
      <Button
        // TODO: fix types
        // @ts-ignore
        as={Link}
        variant="outlined"
        color="primary"
        size="1"
        to={`${getPath(match)}/settings`}
      >
        Edit profile
      </Button>
    </Box>
  ) : null;
}

const NoConnectionsBox: React.FC<{ onConnect: () => void }> = ({
  onConnect,
}: any) => {
  const data = []
  return data.length === 0 ? (
    <MessageBox.Root>
      <MessageBox.Title>Connect to Others</MessageBox.Title>
      <MessageBox.Button onClick={() => onConnect()}>
        <span>Add your first connection</span>
      </MessageBox.Button>
    </MessageBox.Root>
  ) : null;
};

export type NavItemProps = {
  children: React.ReactNode;
  to: string;
  css?: CSS;
  onlyActiveWhenExact?: boolean;
};

// TODO: fix types
function NavItem({
  children,
  to,
  css,
  onlyActiveWhenExact = false,
  ...props
}: NavItemProps) {
  const match = useRouteMatch({
    path: to,
    exact: onlyActiveWhenExact,
  });

  const active = React.useMemo(() => match?.path === to, [match, to]);

  return (
    <Text
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
  );
}
