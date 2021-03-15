import React from 'react';
import { css } from 'emotion';
import {
  Switch,
  useRouteMatch,
  Redirect,
  useHistory,
  LinkProps,
} from 'react-router-dom';
import { PrivateRoute, getPath } from './routes';
import {
  useConnectionCreate,
  useConnectionList,
  useProfile,
} from './mintter-hooks';
import { createDraft } from './mintter-client';
import { Link } from './link';
import { Connections } from './connections';
import { SuggestedConnections } from './suggested-connections';
import { MainColumn } from './main-column';
// import { Icons } from 'components/icons';
import { Publications } from './publications-page';
import { MyPublications } from './my-publications-page';
import { Drafts } from './drafts-page';
import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';
import { Text } from '@mintter/ui/text';
import { Separator } from '@mintter/ui/separator';
import { MessageBox } from './message-box';
export type WithCreateDraft = {
  onCreateDraft: () => void;
};

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function Library() {
  const match = useRouteMatch();
  const history = useHistory();
  const { connectToPeer } = useConnectionCreate();
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
        await connectToPeer(addressList);
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
          await connectToPeer(peer.split(','));

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
    <div className="relative overflow-auto row-start-2" data-testid="page">
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
            <div className="flex items-baseline justify-between">
              <h1 className="text-4xl font-bold text-heading">Library</h1>
              <div className="flex-1" />
              <Button
                variant="primary"
                size="2"
                appearance="pill"
                onClick={onCreateDraft}
              >
                Compose
              </Button>
            </div>
            <div className="flex items-center mt-4 -mx-4">
              <NavItem to={`${match.url}/feed`}>Feed</NavItem>
              <NavItem to={`${match.url}/published`}>Published</NavItem>
              <NavItem to={`${match.url}/drafts`}>Drafts</NavItem>
              <div className="flex-1" />
            </div>
            <NoConnectionsBox onConnect={onConnect} />
            <div>
              <Switch>
                <PrivateRoute exact path={match.url}>
                  <Redirect to={`${match.url}/feed`} />
                </PrivateRoute>
                <PrivateRoute path={`${match.url}/feed`}>
                  <Publications onCreateDraft={onCreateDraft} />
                </PrivateRoute>
                <PrivateRoute path={`${match.url}/published`}>
                  <MyPublications onCreateDraft={onCreateDraft} />
                </PrivateRoute>
                <PrivateRoute path={`${match.url}/drafts`}>
                  <Drafts onCreateDraft={onCreateDraft} />
                </PrivateRoute>
              </Switch>
            </div>
          </MainColumn>
        </div>
        <div />
      </div>
    </div>
  );
}

function ProfileInfo() {
  const match = useRouteMatch();
  const { data: profile } = useProfile();
  return profile ? (
    <div className="text-left">
      <h3 className="font-semibold text-2xl text-heading">
        {profile.username}
      </h3>
      <p className="text-body text-sm mt-2">{profile.bio}</p>
      <Link
        to={`${getPath(match)}/settings`}
        className="text-primary hover:text-primary-hover cursor-pointer text-sm mt-4 underline inline-block"
      >
        Edit profile
      </Link>
    </div>
  ) : null;
}

const NoConnectionsBox: React.FC<{ onConnect: () => void }> = ({
  onConnect,
}: any) => {
  const { data = [] } = useConnectionList();
  return data.length === 0 ? (
    <MessageBox>
      <Text as="h2" size="5" css={{ fontWeight: '$3' }}>
        Connect to Others
      </Text>
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
        {/* 
          // TODO: enable Icons
          <Icons.Plus /> */}
        <Text size="3" color="white">
          Add your first connection
        </Text>
      </Button>
    </MessageBox>
  ) : null;
};

// TODO: fix types
function NavItem({
  children,
  to,
  className = '',
  onlyActiveWhenExact = false,
  ...props
}: any) {
  const match = useRouteMatch({
    path: to,
    exact: onlyActiveWhenExact,
  });

  const active = React.useMemo(() => match?.path === to, [match, to]);

  return (
    <Link
      to={to}
      className={`py-2 px-4 text-md font-light hover:bg-background-muted transition duration-200 relative text-heading rounded overflow-hidden ${className} ${
        active ? 'font-extrabold' : ''
      }`}
      {...props}
    >
      {children}
    </Link>
  );
}
